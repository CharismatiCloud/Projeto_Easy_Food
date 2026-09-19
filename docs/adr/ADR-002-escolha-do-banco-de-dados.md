# ADR-002: Escolha do Banco de Dados para a EasyFood

## Contexto
A API da EasyFood armazenava inicialmente os dados dos restaurantes em um array volátil na memória. Como resultado dessa abordagem, todas as informações cadastradas eram perdidas sempre que o servidor sofria um reinício. Precisávamos de uma solução de persistência confiável que mantivesse os dados salvos em disco sem adicionar uma complexidade de infraestrutura excessiva para o estágio atual do projeto.

## Alternativas Consideradas
1. **PostgreSQL / MySQL:** Bancos relacionais robustos baseados em cliente-servidor. Descartados para este momento devido à necessidade de configuração de ambiente e infraestrutura externa (Docker ou serviços locais).
2. **MongoDB:** Banco de dados NoSQL orientado a documentos. Descartado pois a modelagem relacional simples se adequa melhor ao formato atual de tabelas.
3. **SQLite:** Banco de dados relacional leve que armazena todo o conteúdo em um único arquivo local. 

## Decisão
Escolhemos adotar o **SQLite** como o banco de dados oficial da API EasyFood.

## Justificativa
O SQLite oferece a robustez de um banco de dados relacional com comandos SQL padrão, mas com a enorme vantagem de ser serverless (não requer a instalação ou execução de um servidor de banco de dados separado). Ele grava tudo diretamente em um arquivo local (`database.db`), resolvendo o problema de persistência com simplicidade e rapidez de implementação.

## Consequências Positivas
* **Persistência de Dados:** Os dados cadastrados via POST agora sobrevivem a reinicializações do servidor.
* **Simplicidade de Configuração:** Nenhuma dependência externa pesada ou configuração de infraestrutura complexa é necessária.
* **Portabilidade:** Todo o banco de dados está contido em um único arquivo de fácil manipulação.

## Consequências Negativas
* **Concorrência Limitada:** O SQLite não é ideal para aplicações de altíssima escala com escrita simultânea massiva.
* **Assincronicidade:** A interatividade com o banco introduz a necessidade de lidar com retornos de chamadas (callbacks) ou tratamento assíncrono.

## Critérios de Revisão
Esta decisão deverá ser reavaliada caso a EasyFood escale para múltiplos servidores em nuvem (onde arquivos locais deixam de ser eficientes) ou precise lidar com um volume muito alto de requisições concorrentes, momento em que a migração para um SGBD cliente-servidor (como PostgreSQL) será considerada.