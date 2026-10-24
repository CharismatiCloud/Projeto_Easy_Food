# EasyFood

API e frontend simples para cadastro e consulta de restaurantes e dos seus cardápios, com **autenticação de usuários via JWT**. A listagem de restaurantes e de pratos é pública, e o cadastro de restaurantes exige login. **Só o dono de um restaurante** pode gerenciar o cardápio ou excluí-lo, e cada prato pode ter uma foto, otimizada no próprio servidor. O sistema envia **e-mails transacionais** (confirmação de cadastro, boas-vindas e avisos) pela API da Brevo.

Projeto desenvolvido para a disciplina de **Software Architecture & Design Patterns**.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js (ES Modules) e Express 5 |
| Banco de dados | SQLite com Prisma ORM |
| Autenticação | JWT (`jsonwebtoken`) e hash de senhas com `bcrypt` |
| Configuração | Variáveis de ambiente com `dotenv` |
| E-mail | API REST da [Brevo](https://www.brevo.com/) (chamada com `fetch`, sem biblioteca extra) |
| Upload de imagens | [Multer](https://github.com/expressjs/multer) (recebe o arquivo) e [Sharp](https://sharp.pixelplumbing.com/) (redimensiona e converte para WebP) |
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
| `POST` | `/restaurants` | Protegido | Cadastra um restaurante (quem cadastra passa a ser o dono) |
| `DELETE` | `/restaurants/:id` | Dono | Exclui o restaurante, seus pratos e as fotos |
| `GET` | `/restaurants/:restaurantId/dishes` | Público | Lista o cardápio de um restaurante |
| `POST` | `/restaurants/:restaurantId/dishes` | Dono | Cadastra um prato |
| `POST` | `/dishes/:dishId/image` | Dono | Envia a foto do prato (multipart, campo `image`) |
| `DELETE` | `/dishes/:dishId` | Dono | Exclui o prato e a foto |

Rotas protegidas exigem o header:

```
Authorization: Bearer <token>
```

As rotas marcadas como **Dono** exigem, além do token, que o usuário logado seja o dono do restaurante. Caso contrário, a resposta é `403`. Restaurantes sem dono (criados antes do controle de propriedade) não podem ser alterados por ninguém. As imagens enviadas ficam disponíveis, sem autenticação, em `/uploads/dishes/<arquivo>.webp`.

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

**Cadastrar prato:** `POST /restaurants/1/dishes` (com o header `Authorization`, apenas o dono)

```json
{
  "name": "Pizza Margherita",
  "description": "Molho de tomate, queijo e manjericão",
  "price": 49.90
}
```

Resposta `201 Created`. O preço é devolvido como texto, e o SQLite não preserva zeros à direita (por exemplo, `"49.9"`):

```json
{
  "id": 1,
  "name": "Pizza Margherita",
  "description": "Molho de tomate, queijo e manjericão",
  "price": "49.9",
  "imageUrl": null,
  "restaurantId": 1
}
```

**Enviar a foto do prato:** `POST /dishes/1/image` (com o header `Authorization`, apenas o dono)

O corpo é `multipart/form-data`, com o arquivo no campo `image` (JPEG, PNG ou WebP, até 5 MB). Não defina o `Content-Type` manualmente. No PowerShell:

```
curl.exe -X POST http://localhost:3000/dishes/1/image -H "Authorization: Bearer <token>" -F "image=@foto.jpg"
```

Resposta `200 OK`, com o prato atualizado. A imagem original não é guardada: fica apenas a versão otimizada (largura de até 800 px, em WebP), e o `imageUrl` aponta para ela:

```json
{
  "id": 1,
  "name": "Pizza Margherita",
  "imageUrl": "/uploads/dishes/3f2a....webp"
}
```

Ao trocar a foto, o arquivo anterior é apagado.

**Excluir prato ou restaurante:** `DELETE /dishes/1` e `DELETE /restaurants/1` (com o header `Authorization`, apenas o dono)

Resposta `204 No Content`, sem corpo. A exclusão é definitiva. Ao excluir um restaurante, seus pratos e as fotos também são apagados.

### Códigos de resposta

| Código | Quando acontece |
|---|---|
| `200` | Sucesso em consultas, no login e na confirmação de e-mail |
| `201` | Usuário, restaurante ou prato criado |
| `204` | Exclusão concluída (a resposta não tem corpo) |
| `400` | Campos obrigatórios ausentes, dados inválidos (nome, preço ou id), imagem ausente ou inválida, ou link de confirmação inválido ou expirado |
| `401` | Token ausente, inválido ou expirado, ou credenciais incorretas |
| `403` | Usuário logado, mas que não é o dono do restaurante |
| `404` | Restaurante ou prato não encontrado |
| `409` | E-mail já cadastrado |
| `413` | Imagem acima de 5 MB |
| `500` | Erro interno do servidor |

## Como usar o frontend

1. Acesse `http://localhost:3000`.
2. Clique em **Criar conta**, preencha nome, e-mail e senha. Você entra automaticamente e recebe um e-mail de confirmação (veja também a caixa de spam). Clique no link para confirmar o endereço.
3. Cadastre restaurantes pelo formulário (sem login, o servidor responde 401). O restaurante cadastrado passa a ser seu.
4. Clique em **Ver cardápio** em qualquer restaurante para ver os pratos.
5. Nos restaurantes marcados como **Seu restaurante**, adicione pratos, envie ou troque a foto (JPEG, PNG ou WebP, até 5 MB) e exclua pratos ou o próprio restaurante. Antes de excluir, a página pede confirmação.
6. Use o filtro para listar por categoria.
7. Clique em **Sair** para encerrar a sessão.

O token fica guardado no `localStorage` do navegador.

Os botões de gerenciamento aparecem apenas para o dono, mas quem aplica a regra é o servidor: uma requisição enviada diretamente à API por quem não é dono também recebe `403`.

## Estrutura do projeto

```
easyfood/
├── docs/
│   └── adr/                      # Registros de decisões de arquitetura
├── postman/                      # Collection para testar a API
├── prisma/
│   ├── migrations/               # Histórico de migrations
│   ├── schema.prisma             # Modelos Restaurant, Dish e User (com campos de confirmação de e-mail)
│   └── seed.js                   # Dados de exemplo
├── public/
│   └── index.html                # Frontend
├── uploads/                      # Fotos otimizadas dos pratos (não versionada)
├── src/
│   ├── lib/
│   │   └── prisma.js             # Cliente do Prisma
│   ├── middlewares/
│   │   └── authMiddleware.js     # Validação do JWT
│   ├── modules/
│   │   ├── auth/                 # Cadastro, login, /auth/me e confirmação de e-mail
│   │   ├── restaurants/          # Listagem, cadastro e exclusão de restaurantes
│   │   ├── dishes/               # Cardápio: pratos, foto e regras de dono
│   │   └── shared/
│   │       ├── email.service.js  # sendEmail(): único ponto de contato com a API de e-mail
│   │       ├── image.service.js  # optimizeImage() (Sharp) e removeImage()
│   │       └── upload.middleware.js  # Multer: recebe a imagem e trata os erros de upload
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

## Fluxo de upload de imagem

```
POST /dishes/:dishId/image
   ↓
verifyJWT → o token é válido?                        (401)
   ↓
ensureOwner → o usuário é dono do prato?             (404 / 403)
   ↓
Multer → recebe o arquivo em memória (até 5 MB)      (413 / 400)
   ↓
Sharp → gira, reduz para até 800 px e converte para WebP
   ↓
uploads/dishes/<uuid>.webp
   ↓
Prisma atualiza o imageUrl (a foto anterior é apagada)
```

A verificação de dono acontece **antes** do Multer, para que quem não tem permissão seja recusado sem que o servidor receba o arquivo. Se o processamento da imagem falhar, o prato continua cadastrado, sem foto.

## Regra de dono

```
POST /restaurants      → ownerId = id do usuário do token (nunca do corpo da requisição)
   ↓
Rotas "Dono" → verifyJWT → service compara restaurant.ownerId com req.user.id
   ↓
Diferente (ou ownerId nulo) → 403
```

## Decisões de arquitetura

As decisões técnicas do projeto estão documentadas em `docs/adr/`:

* **ADR-001:** armazenar restaurantes em memória (versão inicial)
* **ADR-002:** escolha do banco de dados (SQLite)
* **ADR-003:** persistência com SQLite via Prisma ORM
* **ADR-004:** autenticação com JWT e hash de senhas
* **ADR-005:** escolha do serviço de envio de e-mail (Brevo) e confirmação de cadastro
* **ADR-006:** processamento de imagens dos pratos na própria API (Multer e Sharp)
* **ADR-007:** autorização por dono do restaurante

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
| `403` ao cadastrar prato, enviar foto ou excluir | O usuário logado não é o dono do restaurante, ou o restaurante não tem dono | Confira a coluna `ownerId` da tabela `Restaurant` em `npx prisma studio` |
| `Imagem maior que 5 MB` (`413`) | O arquivo ultrapassa o limite do upload | Envie uma imagem menor |
| `O arquivo enviado não é uma imagem válida` | O arquivo não é um JPEG, PNG ou WebP de verdade (renomear a extensão não funciona) | Envie uma imagem real |
| `Nenhuma imagem enviada` (`400`) | A requisição não tem arquivo ou o campo não se chama `image` | Envie o arquivo no campo `image` |

## Limitações conhecidas

Este projeto tem fins didáticos. Antes de uso em produção, seria necessário:

* Servir a aplicação por **HTTPS**.
* Guardar o token em cookie `httpOnly`, em vez de `localStorage`.
* Limitar tentativas de login (rate limiting).
* Criar perfis de acesso (como administrador) e permitir mais de um responsável por restaurante. Hoje qualquer usuário autenticado pode cadastrar restaurantes, e apenas o dono gerencia o seu.
* Guardar as imagens em um armazenamento externo (como o S3), já que hoje ficam no disco do servidor, e reavaliar o processamento de imagens fora da API caso o volume cresça.
* Trocar a exclusão definitiva por exclusão lógica, caso seja necessário recuperar restaurantes e pratos.
* Permitir a revogação de tokens antes da expiração.
* Usar um **domínio próprio autenticado** (SPF, DKIM e DMARC) como remetente, para melhorar a entrega dos e-mails.
* Exigir o e-mail confirmado para entrar, criar a rota de reenvio da confirmação e enviar os e-mails em segundo plano (fila), já que hoje o envio é síncrono e limitado a 300 por dia no plano gratuito.

Mais detalhes nos **ADR-004**, **ADR-005**, **ADR-006** e **ADR-007**.