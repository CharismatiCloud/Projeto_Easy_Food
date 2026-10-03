# EasyFood

API e frontend simples para cadastro e consulta de restaurantes, com **autenticação de usuários via JWT**. A listagem de restaurantes é pública, e o cadastro de novos restaurantes exige login. O sistema envia **e-mails transacionais** (confirmação de cadastro, boas-vindas e avisos) pela API da Brevo.

Projeto desenvolvido para a disciplina de **Software Architecture & Design Patterns**.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js (ES Modules) e Express 5 |
| Banco de dados | SQLite com Prisma ORM |
| Autenticação | JWT (`jsonwebtoken`) e hash de senhas com `bcrypt` |
| Configuração | Variáveis de ambiente com `dotenv` |
| E-mail | API REST da [Brevo](https://www.brevo.com/) (chamada com `fetch`, sem biblioteca extra) |
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

# 3. Edite o .env: defina o JWT_SECRET e as variáveis de e-mail (veja as seções abaixo)

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
| `EMAIL_API_KEY` | Para enviar e-mails | Chave de API da Brevo (começa com `xkeysib-`) |
| `EMAIL_FROM` | Para enviar e-mails | Remetente verificado na Brevo. É o mesmo para todos os e-mails enviados |
| `EMAIL_FROM_NAME` | Não | Nome exibido como remetente (padrão: `EasyFood`) |
| `APP_URL` | Não | Endereço base usado no link de confirmação (padrão: `http://localhost:3000`) |
| `COMMERCIAL_EMAIL` | Não | Recebe o aviso de novo restaurante. Se ficar vazio, o aviso não é enviado |

As variáveis de e-mail não impedem o servidor de iniciar. Sem elas, o cadastro continua funcionando, mas os e-mails falham e o erro aparece no terminal.

Para gerar uma chave aleatória para o `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

O arquivo `.env` **não deve ser versionado nem enviado**: ele já está no `.gitignore`.

## Configurando o envio de e-mail (Brevo)

O envio usa o plano gratuito da Brevo (300 e-mails por dia). Para ativar:

1. Crie uma conta em [brevo.com](https://www.brevo.com/).
2. Gere uma chave de API em **SMTP & API > API Keys** e copie-a na hora (ela só é exibida uma vez). Use a chave da aba **API Keys**, e não a da aba SMTP.
3. Cadastre e verifique o remetente em **Senders, Domains & Dedicated IPs > Senders**.
4. Preencha o `.env`:

```env
EMAIL_API_KEY="sua-chave-da-brevo"
EMAIL_FROM="seu-remetente-verificado@exemplo.com"
EMAIL_FROM_NAME="EasyFood"
APP_URL="http://localhost:3000"
COMMERCIAL_EMAIL="email-do-comercial@exemplo.com"
```

5. Reinicie o servidor, pois o `.env` só é lido ao iniciar.

Os e-mails enviados pelo sistema:

| Evento | Destinatário | Assunto |
|---|---|---|
| Cadastro de usuário | E-mail do novo usuário | Confirme seu e-mail na EasyFood |
| Cadastro de restaurante | Usuário logado | Bem-vindo à EasyFood, *nome do restaurante*! |
| Cadastro de restaurante | `COMMERCIAL_EMAIL` | Novo restaurante cadastrado: *nome do restaurante* |

Todos usam a mesma função, `sendEmail()`, em `src/modules/shared/email.service.js`. O e-mail é uma ação secundária: se o envio falhar, o usuário ou o restaurante continua sendo salvo e o erro é registrado no terminal.

> **Atenção:** com um remetente de e-mail gratuito (Gmail, Outlook), a Brevo exibe o aviso "Freemail domain is not recommended" e os e-mails podem cair no spam. Para uso real, autentique um domínio próprio (SPF, DKIM e DMARC) na aba **Domains**. Se aparecer o erro `401 unrecognised IP address`, autorize o seu IP em **Authorised IPs** no painel da Brevo.

## Endpoints

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | Público | Cria um usuário |
| `POST` | `/auth/login` | Público | Autentica e devolve um token JWT |
| `GET` | `/auth/confirm-email?token=...` | Público | Confirma o e-mail pelo link recebido (responde com uma página HTML) |
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

Resposta `201 Created` (a senha nunca é devolvida). O usuário também recebe um e-mail com o link de confirmação, válido por 24 horas e de uso único:

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

**Confirmar e-mail:** `GET /auth/confirm-email?token=<token>`

É o link enviado por e-mail, aberto no navegador. Responde `200` com a página "E-mail confirmado!" ou `400` com "Link inválido ou expirado". Na versão atual, a confirmação não é exigida para fazer login.

**Cadastrar restaurante:** `POST /restaurants` (com o header `Authorization`)

```json
{
  "name": "Pizzaria Napoli",
  "category": "Pizza",
  "rating": 4.5
}
```

Resposta `201 Created` com o restaurante criado. O usuário logado recebe um e-mail de boas-vindas e o `COMMERCIAL_EMAIL` recebe um aviso de novo restaurante.

### Códigos de resposta

| Código | Quando acontece |
|---|---|
| `200` | Sucesso em consultas, no login e na confirmação de e-mail |
| `201` | Usuário ou restaurante criado |
| `400` | Campos obrigatórios ausentes, ou link de confirmação inválido ou expirado |
| `401` | Token ausente, inválido ou expirado, ou credenciais incorretas |
| `409` | E-mail já cadastrado |
| `500` | Erro interno do servidor |

## Como usar o frontend

1. Acesse `http://localhost:3000`.
2. Clique em **Criar conta**, preencha nome, e-mail e senha. Você entra automaticamente e recebe um e-mail de confirmação (veja também a caixa de spam). Clique no link para confirmar o endereço.
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
│   ├── schema.prisma             # Modelos Restaurant e User (com campos de confirmação de e-mail)
│   └── seed.js                   # Dados de exemplo
├── public/
│   └── index.html                # Frontend
├── src/
│   ├── lib/
│   │   └── prisma.js             # Cliente do Prisma
│   ├── middlewares/
│   │   └── authMiddleware.js     # Validação do JWT
│   ├── modules/
│   │   ├── auth/                 # Cadastro, login, /auth/me e confirmação de e-mail
│   │   ├── restaurants/          # Listagem e cadastro de restaurantes
│   │   └── shared/
│   │       └── email.service.js  # sendEmail(): único ponto de contato com a API de e-mail
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

## Fluxo de confirmação de e-mail

```
POST /auth/register
   ↓
Gera token aleatório → grava só o hash (SHA-256) + validade de 24 h
   ↓
Cria o usuário no banco (operação principal)
   ↓
sendEmail() → API da Brevo (ação secundária: falha apenas é registrada)
   ↓
Usuário clica no link: GET /auth/confirm-email?token=...
   ↓
Token válido → emailVerified = true e token apagado (uso único)
```

## Decisões de arquitetura

As decisões técnicas do projeto estão documentadas em `docs/adr/`:

* **ADR-001:** armazenar restaurantes em memória (versão inicial)
* **ADR-002:** escolha do banco de dados (SQLite)
* **ADR-003:** persistência com SQLite via Prisma ORM
* **ADR-004:** autenticação com JWT e hash de senhas
* **ADR-005:** escolha do serviço de envio de e-mail (Brevo) e confirmação de cadastro

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
| `EMAIL_API_KEY e EMAIL_FROM precisam estar no .env` | Variáveis de e-mail ausentes ou servidor não reiniciado | Preencha o `.env` e reinicie o servidor |
| `Brevo respondeu 401: Key not found` | Chave de API incorreta (ou chave SMTP no lugar da de API) | Gere uma chave em **API Keys** e atualize o `.env` |
| `Brevo respondeu 401` com `unrecognised IP address` | IP não autorizado na Brevo | Autorize o IP em **Authorised IPs** |
| `Brevo respondeu 400` citando o remetente | `EMAIL_FROM` não está verificado | Verifique o remetente em **Senders** |
| Log mostra "Enviado", mas o e-mail não chega | Caiu no spam ou o remetente é de e-mail gratuito | Confira o spam e **Transactional > Logs** no painel da Brevo |
| `Unknown argument verifyToken` ao cadastrar | Migration de e-mail não aplicada | Pare o servidor e rode `npx prisma migrate dev` |
| "E-mail já cadastrado" ao repetir um teste | O usuário anterior continua no banco | Apague-o em `npx prisma studio` (tabela `User`) |

## Limitações conhecidas

Este projeto tem fins didáticos. Antes de uso em produção, seria necessário:

* Servir a aplicação por **HTTPS**.
* Guardar o token em cookie `httpOnly`, em vez de `localStorage`.
* Limitar tentativas de login (rate limiting).
* Criar perfis de acesso, pois hoje qualquer usuário autenticado pode cadastrar restaurantes.
* Permitir a revogação de tokens antes da expiração.
* Usar um **domínio próprio autenticado** (SPF, DKIM e DMARC) como remetente, para melhorar a entrega dos e-mails.
* Exigir o e-mail confirmado para entrar, criar a rota de reenvio da confirmação e enviar os e-mails em segundo plano (fila), já que hoje o envio é síncrono e limitado a 300 por dia no plano gratuito.

Mais detalhes no **ADR-004** e no **ADR-005**.