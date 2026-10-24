# ADR-006: Processamento de Imagens dos Pratos na Própria API

## Contexto
Com a criação do cardápio, cada prato de um restaurante pode ter uma foto. As fotos enviadas pelos usuários costumam vir de celulares ou câmeras e podem ter vários megabytes e milhares de pixels de largura. Entregar esses arquivos como foram enviados aumentaria o tempo de carregamento da página e o consumo de dados de quem consulta o cardápio.

Por isso, a EasyFood precisa receber a imagem, reduzir seu tamanho, convertê-la para um formato leve e armazenar apenas a versão otimizada. O projeto está em fase acadêmica, com demanda limitada, e já possui uma API Node.js/Express organizada como monólito modular.

## Alternativas Consideradas
1. **Processar dentro da API EasyFood:** A própria API recebe o arquivo (Multer), otimiza (Sharp) e grava no disco. Mantém tudo no mesmo servidor e no mesmo código.
2. **Criar um serviço independente (microsserviço):** Um segundo serviço dedicado a imagens, chamado pela API. Isolaria o consumo de CPU, mas exigiria outro projeto para implantar, comunicação entre serviços e tratamento de falhas dessa comunicação.
3. **Utilizar Serverless/FaaS:** Uma função em nuvem acionada a cada envio, normalmente lendo e gravando em um armazenamento externo (como o S3). Escala sozinha e não ocupa a API, mas exige conta e configuração em um provedor, armazenamento externo, permissões e um fluxo de eventos.

## Decisão
Manter o processamento de imagens **dentro da API EasyFood**, usando:

* **Multer** para receber o arquivo, em memória, com limite de 5 MB e um arquivo por requisição. Aceita apenas JPEG, PNG e WebP.
* **Sharp** para corrigir a orientação, limitar a largura a 800 pixels (sem ampliar imagens menores) e converter para WebP com qualidade 80.
* O módulo compartilhado `src/modules/shared/image.service.js`, para que logotipos de restaurantes e outras imagens reutilizem a mesma lógica no futuro.
* Armazenamento local na pasta `uploads/dishes/`, com nome de arquivo gerado por UUID. O caminho da imagem otimizada é gravado no campo `imageUrl` do prato.

Não serão implementados microsserviços, filas nem funções Serverless neste momento.

## Justificativa
* **Simplicidade:** nenhuma peça nova de infraestrutura para instalar, configurar ou monitorar.
* **Baixo volume inicial:** poucos envios, em ritmo baixo, que a API comporta sem dificuldade.
* **Infraestrutura já existente:** reaproveita o servidor, o banco e a organização em módulos que já temos.
* **Facilidade de implementação:** duas bibliotecas e um serviço compartilhado resolvem a necessidade.
* **Contexto acadêmico:** o objetivo é demonstrar a decisão e suas consequências, e não operar em escala.

A validação do arquivo também ficou simples: o tipo informado pelo cliente (`mimetype`) pode ser falso, mas o Sharp só consegue processar um arquivo que seja realmente uma imagem. Um arquivo inválido é rejeitado com `400`. Como a imagem é reconvertida, os metadados originais (como a localização GPS de fotos de celular) não vão para o arquivo final.

## Consequências Positivas
* **Menor complexidade inicial:** menos componentes para configurar e entender.
* **Aproveitamento da infraestrutura existente:** sem custo ou conta adicional.
* **Reuso:** o serviço compartilhado atende outros módulos sem duplicar código.
* **Menos dados trafegados:** imagens menores melhoram o tempo de carregamento e o consumo de dados dos usuários.

## Consequências Negativas
* **Consumo de CPU e memória da API:** cada envio ocupa até 5 MB de memória e o processamento acontece no mesmo processo que atende as demais requisições.
* **Possível impacto em outras requisições:** vários envios simultâneos podem deixar a API mais lenta.
* **Armazenamento local:** as imagens ficam no disco do servidor. Em um ambiente com várias instâncias ou com sistema de arquivos temporário, seria necessário um armazenamento externo, como o S3.
* **Imagens públicas:** os arquivos em `/uploads` são acessíveis a qualquer pessoa que conheça o endereço, sem controle de acesso.

Para reduzir esses riscos, adotamos o limite de 5 MB, um arquivo por requisição, um limite de pixels na leitura da imagem (proteção contra arquivos que parecem pequenos, mas são enormes ao serem decodificados) e a verificação de permissão do usuário **antes** de receber o arquivo (veja o ADR-007).

## Critérios de Revisão
Esta decisão deverá ser reavaliada se o volume de imagens crescer, se a API passar a rodar em várias instâncias ou em um ambiente com disco temporário, se o processamento começar a afetar o tempo de resposta das demais rotas, ou se surgir a necessidade de gerar várias versões de cada imagem (como miniaturas) ou de entregá-las por uma CDN.

Esta decisão não significa que Serverless seja inadequado. Significa que, neste momento, outra alternativa atende melhor às necessidades do projeto.
