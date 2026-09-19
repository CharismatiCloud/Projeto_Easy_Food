# ADR-003: Implementação da Persistência no SQLite via Prisma ORM

## Contexto
Com a adoção do SQLite para resolver o problema de perda de dados ao reiniciar a API da EasyFood (conforme ADR-002), precisávamos definir a melhor forma da aplicação Node.js se comunicar com o banco de dados. Escrever consultas SQL puras diretamente nas rotas usando drivers nativos tornaria o código complexo, de difícil manutenção e suscetível a erros, além de exigir a criação e gestão manual da estrutura das tabelas.

## Alternativas consideradas
1. **Driver Nativo (`sqlite3`):** Execução de comandos SQL puros. Descartado devido à alta verbosidade, falta de tipagem e necessidade de gerenciar o esquema do banco manualmente.
2. **Query Builders (ex: Knex.js):** Ferramentas que constroem queries SQL usando sintaxe JavaScript. Descartado pois, embora melhorem a escrita das queries, não oferecem um ecossistema tão automatizado para gerar tabelas e histórico de migrações.
3. **Prisma ORM:** Um ORM (Object-Relational Mapper) moderno que utiliza um arquivo declarativo (`schema.prisma`) para modelar tabelas e gera automaticamente um cliente de banco de dados para a aplicação.

## Decisão
Escolhemos adotar o **Prisma ORM** como a ferramenta oficial para realizar a integração, criação das tabelas e manipulação de dados entre a API Node.js/Express e o banco de dados SQLite.

## Justificativa
O Prisma fornece uma abordagem moderna e simplificada. Através do arquivo de schema, definimos a entidade `Restaurant` visualmente, e o ORM cria o arquivo `.db` e as tabelas de forma automática. Além disso, o `PrismaClient` substitui strings de comandos SQL por funções JavaScript nativas (como `prisma.restaurant.findMany()`), tornando as rotas do Express menores, mais legíveis e menos suscetíveis a vulnerabilidades como SQL Injection.

## Consequências positivas
* **Produtividade e Código Limpo:** Separação clara entre a lógica da rota e a complexidade do banco de dados.
* **Histórico de Alterações:** O sistema de migrations (`prisma migrate dev`) cria um versionamento seguro da estrutura do banco, facilitando o trabalho em equipe.
* **Seed Integrado:** O uso do `PrismaClient` facilitou a injeção inicial de dados (`seed.js`) para fins de teste.

## Consequências negativas / trade-offs
* **Curva de Aprendizado (Trade-off):** A equipe precisa dedicar um tempo inicial para aprender a sintaxe do `schema.prisma` e os comandos do CLI, mas ganha agilidade e segurança no longo prazo.
* **Peso do Projeto:** O Prisma adiciona novos pacotes na pasta `node_modules` (`prisma` e `@prisma/client`), aumentando levemente o tamanho do projeto em relação a usar apenas um driver nativo.

## Critérios de revisão
Esta decisão deverá ser reavaliada se o projeto migrar para bancos de dados NoSQL (onde outras bibliotecas como Mongoose são padrão) ou caso a abstração feita pelo ORM se torne um gargalo de performance para consultas analíticas de altíssima complexidade no futuro.