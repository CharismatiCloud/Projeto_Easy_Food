# ADR-007: Autorização por Dono do Restaurante

## Contexto
O ADR-004 introduziu a autenticação com JWT, que comprova que a pessoa que faz a requisição está logada. Ao criar o cardápio, percebemos que isso não basta: se apenas o token fosse exigido, **qualquer usuário cadastrado poderia adicionar pratos, trocar fotos ou excluir o cardápio de qualquer restaurante**. Além disso, o modelo `Restaurant` não tinha nenhum vínculo com o usuário que o cadastrou, então o sistema não tinha como saber quem deveria poder alterá-lo.

## Alternativas Consideradas
1. **Apenas JWT, como nas rotas anteriores:** Simples, mas só comprova a autenticação. Deixaria qualquer usuário logado alterar qualquer restaurante. Descartada por não atender ao requisito de segurança.
2. **Perfis de acesso (roles), como administrador e restaurante:** Permite regras amplas, mas exige criar e administrar os perfis, e ainda precisaria ligar cada usuário ao seu restaurante. Descartada neste momento por ser desproporcional ao estágio do projeto.
3. **Dono por restaurante (`ownerId`):** Cada restaurante guarda o usuário que o cadastrou, e só ele pode gerenciar o cardápio e excluir o restaurante.

## Decisão
Adotar o **dono por restaurante**, com as seguintes regras:

* **Modelo:** o campo opcional `ownerId` em `Restaurant` referencia `User`. Ele é opcional para que os restaurantes já existentes continuem válidos.
* **Preenchimento:** no cadastro do restaurante, o `ownerId` recebe o `id` do usuário **identificado pelo token** (`req.user.id`), e nunca um valor enviado no corpo da requisição.
* **Quem pode o quê:** a consulta ao cardápio é pública. Cadastrar e excluir pratos, enviar a foto do prato e excluir o restaurante exigem token válido **e** que o usuário seja o dono. Quem não é o dono recebe `403`.
* **Onde fica a regra:** nos services (`getOwnedRestaurant`, `getOwnedDish` e `deleteRestaurant`), seguindo a arquitetura em camadas. Os botões do frontend apenas escondem as ações de quem não é dono, e a decisão final é sempre do servidor.
* **Envio de imagem:** a permissão é verificada por um middleware **antes** do Multer, para que quem não é dono seja recusado sem que o servidor carregue o arquivo em memória. O service verifica de novo, de modo que cada camada protege a si mesma.
* **Restaurantes sem dono:** os criados antes desta decisão ficam com `ownerId` nulo e **não podem ser alterados por ninguém** até que um dono seja atribuído diretamente no banco. É o comportamento mais seguro.
* **Exclusão de restaurante:** é definitiva. O restaurante e seus pratos são removidos em uma única transação (tudo ou nada). As fotos só são apagadas do disco depois que o banco confirma, e uma falha nessa limpeza não desfaz a exclusão.

## Justificativa
É a menor mudança que resolve o problema: um campo, uma comparação e um código de resposta (`403`). Reaproveita o JWT já existente e a estrutura de módulos, sem criar perfis nem tabelas novas. Obter o dono a partir do token, e não do corpo da requisição, impede que alguém se passe por outro usuário. Fazer a verificação nos services mantém a regra em um só lugar, independentemente da rota ou da interface usada.

## Consequências Positivas
* **Segurança:** cada usuário só altera o que é seu, mesmo que alguém envie requisições diretamente à API.
* **Simplicidade:** sem perfis, sem permissões configuráveis e sem tabelas adicionais.
* **Proteção de recursos:** a verificação antes do Multer evita processar arquivos de quem não tem permissão.
* **Consistência:** a exclusão em transação não deixa pratos sem restaurante.

## Consequências Negativas
* **Um único responsável por restaurante:** não há como compartilhar a gestão entre várias pessoas, nem transferir a propriedade pela aplicação.
* **Sem administrador:** ninguém pode corrigir ou remover restaurantes de outros usuários, nem atribuir dono aos restaurantes antigos, a não ser alterando o banco.
* **Exclusão definitiva:** não há como recuperar um restaurante ou prato excluído.
* **E-mail não verificado:** a confirmação de e-mail ainda não é exigida para gerenciar o cardápio (veja o ADR-005).
* **Qualquer usuário logado pode cadastrar restaurantes**, pois não há perfil que diferencie quem pode fazê-lo.

## Critérios de Revisão
Esta decisão deverá ser reavaliada se surgir a necessidade de mais de um responsável por restaurante, de um perfil de administrador ou de suporte, de transferência de propriedade, de recuperação de itens excluídos (exclusão lógica) ou de exigir o e-mail confirmado para ações de escrita.
