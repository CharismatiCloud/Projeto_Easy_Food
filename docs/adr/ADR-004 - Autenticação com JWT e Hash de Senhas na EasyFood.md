# ADR-004: Autenticação com JWT e Hash de Senhas na EasyFood

## Contexto
Com a persistência em SQLite via Prisma já implementada (ADR-002 e ADR-003), qualquer pessoa podia cadastrar restaurantes na API da EasyFood, pois nenhuma rota exigia identificação. Precisávamos de um mecanismo para cadastrar usuários, identificá-los nas requisições seguintes e proteger as rotas de escrita (`POST /restaurants`), mantendo a listagem (`GET /restaurants`) pública. A solução deveria ser simples de implementar no estágio atual do projeto e compatível com a arquitetura em camadas (routes, controller e service) já adotada.

## Alternativas Consideradas
1. **Sessões com cookie (server-side):** O servidor guarda a sessão de cada usuário e envia um identificador por cookie. Descartada porque exige armazenamento de sessões no servidor (memória, banco ou Redis) e adiciona estado e infraestrutura que a API não tinha até então.
2. **HTTP Basic Auth:** O cliente envia e-mail e senha em toda requisição. Descartada por expor a senha a cada chamada e por não permitir expiração nem identificação do usuário de forma segura.
3. **Provedor externo de identidade (OAuth, Auth0, Firebase Auth):** Delega cadastro e login a um serviço de terceiros. Descartada neste momento por introduzir dependência externa e configuração desproporcionais para o estágio atual do projeto.
4. **JWT (JSON Web Token) com Bearer Token:** Após o login, a API devolve um token assinado que o cliente envia no header `Authorization` das requisições protegidas.

## Decisão
Escolhemos adotar **JWT** para autenticar as requisições e **bcrypt** para armazenar as senhas, com as seguintes regras:

* **Cadastro e login:** `POST /auth/register` cria o usuário e `POST /auth/login` valida as credenciais e devolve `{ token, user }`.
* **Senhas:** Nunca são gravadas em texto puro. O cadastro grava apenas o hash gerado pelo bcrypt (custo 10), e o login usa `bcrypt.compare()` para conferir a senha.
* **Token:** Assinado com o segredo `JWT_SECRET`, contém o identificador do usuário (`sub`) e o e-mail, e expira em 1 dia.
* **Segredo:** Lido da variável de ambiente `JWT_SECRET` (arquivo `.env`), sem valor padrão no código. O servidor não inicia se a variável estiver ausente.
* **Proteção de rotas:** Um middleware lê o header `Authorization: Bearer <token>`, valida o token e responde 401 quando ele está ausente, inválido ou expirado.
* **Rotas protegidas:** `POST /restaurants` e `GET /auth/me`. As demais rotas (`GET /restaurants`, `POST /auth/register` e `POST /auth/login`) permanecem públicas.
* **Erros padronizados:** 400 para campos obrigatórios ausentes, 409 para e-mail já cadastrado e 401 para credenciais inválidas, sem revelar se o e-mail existe ou se a senha está errada.

## Justificativa
O JWT torna a API **stateless**: o servidor não precisa guardar sessões, pois toda a informação necessária para identificar o usuário está no próprio token, validado por meio da assinatura. Isso mantém a simplicidade que motivou a escolha do SQLite e se encaixa bem no formato de uma API consumida por um frontend em JavaScript. O bcrypt aplica um hash lento e com salt, o que dificulta ataques de força bruta e garante que um vazamento do banco não exponha as senhas originais. Manter o segredo no `.env` evita que a chave de assinatura seja versionada junto com o código.

## Consequências Positivas
* **Proteção das rotas de escrita:** Somente usuários autenticados conseguem cadastrar restaurantes, enquanto a consulta continua aberta a qualquer pessoa.
* **API sem estado:** Não há armazenamento de sessões, o que simplifica a implantação e permite escalar horizontalmente no futuro.
* **Segurança das senhas:** Senhas armazenadas apenas como hash, nunca retornadas nas respostas da API.
* **Reaproveitamento:** O middleware de autenticação pode proteger novas rotas com uma única linha, o que combina com a arquitetura em camadas.

## Consequências Negativas
* **Sem revogação imediata:** Um token emitido continua válido até expirar (1 dia), mesmo que o usuário faça logout. O botão "Sair" do frontend apenas descarta o token no navegador.
* **Gestão do segredo:** Se o `JWT_SECRET` vazar, qualquer pessoa pode forjar tokens válidos. Trocar o segredo invalida todos os tokens existentes.
* **Armazenamento no frontend:** O token é guardado em `localStorage`, que é vulnerável a ataques de XSS. É aceitável para o escopo atual, mas não é o ideal para produção.
* **Autorização básica:** Qualquer usuário autenticado pode cadastrar restaurantes, pois não há perfis ou papéis (por exemplo, administrador).
* **Sem proteção contra força bruta:** A API ainda não limita tentativas de login (rate limiting) e não usa HTTPS no ambiente local, o que será necessário em produção.

## Critérios de Revisão
Esta decisão deverá ser reavaliada caso a EasyFood precise de **perfis de acesso** (como administrador e dono de restaurante), de **revogação imediata de sessões** ou de **refresh tokens**, caso passe a ter **login social** ou vários serviços compartilhando a mesma identidade, ou quando for para **produção**, momento em que deverão ser considerados HTTPS obrigatório, cookies `httpOnly` no lugar de `localStorage` e limitação de tentativas de login.