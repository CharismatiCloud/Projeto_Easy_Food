# EasyFood

API e frontend simples para cadastro e consulta de restaurantes, com **autenticação de usuários via JWT**. A listagem de restaurantes é pública, e o cadastro de novos restaurantes exige login.

Projeto desenvolvido para a disciplina de **Software Architecture & Design Patterns**.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js (ES Modules) e Express 5 |
| Banco de dados | SQLite com Prisma ORM |
| Autenticação | JWT (`jsonwebtoken`) e hash de senhas com `bcrypt` |
| Configuração | Variáveis de ambiente com `dotenv` |
| Frontend | HTML, CSS e JavaScript puros (pasta `public/`) |

## Pré-requisitos

* [Node.js](https://nodejs.org/) 18 ou superior
* npm (já vem com o Node.js)

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Crie o arquivo de ambiente a partir do modelo
#    Linux/macOS:
cp .env.example .env
#    Windows (PowerShell):
Copy-Item .env.example .env

# 3. Edite o .env e defina um JWT_SECRET (veja a seção abaixo)

# 4. Crie o banco e as tabelas
npx prisma migrate dev

# 5. (Opcional) Popule o banco com restaurantes de exemplo
npx prisma db seed

# 6. Inicie o servidor
npm start
```

Depois, acesse **http://localhost:3000** no navegador.

> **Importante:** abra a página pelo endereço acima. Abrir o `index.html` direto do disco (`file:///...`) faz o navegador bloquear as chamadas à API, e a página mostra "Erro ao conectar com o servidor da API".

Para desenvolvimento, com reinício automático a cada alteração:

```bash
npm run dev
```

## Variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto (o `.env.example` serve de modelo):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Caminho do banco SQLite, relativo à pasta `prisma/`. Exemplo: `file:./dev.db` |
| `JWT_SECRET` | Sim | Chave usada para assinar os tokens. O servidor não inicia sem ela |
| `PORT` | Não | Porta do servidor (padrão: `3000`) |

Para gerar uma chave aleatória para o `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

O arquivo `.env` **não deve ser versionado nem enviado**: ele já está no `.gitignore`.

## Endpoints

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | Público | Cria um usuário |
| `POST` | `/auth/login` | Público | Autentica e devolve um token JWT |
| `GET` | `/auth/me` | Protegido | Devolve o usuário identificado pelo token |
| `GET` | `/restaurants` | Público | Lista os restaurantes |
| `POST` | `/restaurants` | Protegido | Cadastra um restaurante |

Rotas protegidas exigem o header:

```
Authorization: Bearer <token>
```

### Exemplos

**Criar usuário:** `POST /auth/register`

```json
{
  "name": "Aluno",
  "email": "aluno@easyfood.com",
  "password": "123456"
}
```

Resposta `201 Created` (a senha nunca é devolvida):

```json
{
  "id": 1,
  "name": "Aluno",
  "email": "aluno@easyfood.com"
}
```

**Entrar:** `POST /auth/login`

```json
{
  "email": "aluno@easyfood.com",
  "password": "123456"
}
```

Resposta `200 OK`:

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": 1, "name": "Aluno", "email": "aluno@easyfood.com" }
}
```

**Cadastrar restaurante:** `POST /restaurants` (com o header `Authorization`)

```json
{
  "name": "Pizzaria Napoli",
  "category": "Pizza",
  "rating": 4.5
}
```

Resposta `201 Created` com o restaurante criado.

### Códigos de resposta

| Código | Quando acontece |
|---|---|
| `200` | Sucesso em consultas e no login |
| `201` | Usuário ou restaurante criado |
| `400` | Campos obrigatórios ausentes |
| `401` | Token ausente, inválido ou expirado, ou credenciais incorretas |
| `409` | E-mail já cadastrado |
| `500` | Erro interno do servidor |

## Como usar o frontend

1. Acesse `http://localhost:3000`.
2. Clique em **Criar conta**, preencha nome, e-mail e senha. Você entra automaticamente.
3. Cadastre restaurantes pelo formulário (sem login, o servidor responde 401).
4. Use o filtro para listar por categoria.
5. Clique em **Sair** para encerrar a sessão.

O token fica guardado no `localStorage` do navegador.

## Estrutura do projeto

```
easyfood/
├── docs/
│   └── adr/                      # Registros de decisões de arquitetura
├── postman/                      # Collection para testar a API
├── prisma/
│   ├── migrations/               # Histórico de migrations
│   ├── schema.prisma             # Modelos Restaurant e User
│   └── seed.js                   # Dados de exemplo
├── public/
│   └── index.html                # Frontend
├── src/
│   ├── lib/
│   │   └── prisma.js             # Cliente do Prisma
│   ├── middlewares/
│   │   └── authMiddleware.js     # Validação do JWT
│   ├── modules/
│   │   ├── auth/                 # Cadastro, login e /auth/me
│   │   └── restaurants/          # Listagem e cadastro de restaurantes
│   ├── app.js                    # Configuração do Express e rotas
│   └── server.js                 # Inicialização do servidor
├── .env.example
├── package.json
└── README.md
```

Cada módulo segue a arquitetura em camadas: **routes** (define as rotas), **controller** (trata a requisição e a resposta) e **service** (regras de negócio e acesso ao banco).

## Fluxo de autenticação

```
Cadastro
   ↓
senha → bcrypt → hash → banco de dados
   ↓
Login
   ↓
bcrypt.compare()
   ↓
JWT (validade de 1 dia)
   ↓
Authorization: Bearer <token>
   ↓
Middleware valida o token
   ↓
Rota protegida
```

## Decisões de arquitetura

As decisões técnicas do projeto estão documentadas em `docs/adr/`:

* **ADR-001:** armazenar restaurantes em memória (versão inicial)
* **ADR-002:** escolha do banco de dados (SQLite)
* **ADR-003:** persistência com SQLite via Prisma ORM
* **ADR-004:** autenticação com JWT e hash de senhas

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor |
| `npm run dev` | Inicia com reinício automático (`node --watch`) |
| `npx prisma migrate dev` | Aplica as migrations e atualiza o banco |
| `npx prisma db seed` | Insere restaurantes de exemplo |
| `npx prisma studio` | Abre uma interface para consultar o banco |

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Erro ao conectar com o servidor da API" | Página aberta como arquivo ou servidor parado | Rode `npm start` e acesse `http://localhost:3000` |
| `JWT_SECRET não definido no .env` | Variável ausente | Defina o `JWT_SECRET` no `.env` |
| `Cannot find module ...` | Dependências não instaladas | Rode `npm install` |
| `EADDRINUSE` | Porta 3000 já em uso | Encerre o outro processo ou defina outra `PORT` no `.env` |
| Erro do Prisma sobre tabela inexistente | Migrations não aplicadas | Rode `npx prisma migrate dev` |
| `401` mesmo depois de logar | Token expirado ou `JWT_SECRET` alterado | Saia e entre novamente |

## Limitações conhecidas

Este projeto tem fins didáticos. Antes de uso em produção, seria necessário:

* Servir a aplicação por **HTTPS**.
* Guardar o token em cookie `httpOnly`, em vez de `localStorage`.
* Limitar tentativas de login (rate limiting).
* Criar perfis de acesso, pois hoje qualquer usuário autenticado pode cadastrar restaurantes.
* Permitir a revogação de tokens antes da expiração.

Mais detalhes no **ADR-004**.
