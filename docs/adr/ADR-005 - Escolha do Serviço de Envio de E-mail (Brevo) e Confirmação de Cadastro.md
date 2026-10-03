# ADR-005: Escolha do Serviço de Envio de E-mail (Brevo) e Confirmação de Cadastro

## Contexto
Com a autenticação por JWT já implementada (ADR-004), a EasyFood passou a cadastrar usuários sem verificar se o e-mail informado realmente pertence a eles, e não tinha nenhuma forma de se comunicar com os usuários. Precisávamos de um mecanismo para **confirmar o e-mail no cadastro** e para **notificar eventos do sistema** (boas-vindas ao cadastrar um restaurante e aviso interno para a equipe comercial). As exigências eram: **custo zero**, envio **por API**, compatibilidade com a arquitetura em camadas (routes, controller e service) e possibilidade de enviar para **qualquer usuário**, e não apenas para o dono da conta do provedor. Como o envio depende de um serviço externo, também era necessário garantir que sua falha **não impedisse** o cadastro de usuários e restaurantes.

## Alternativas Consideradas
1. **SMTP direto com Gmail/Outlook (ex.: Nodemailer):** Usa a conta de e-mail pessoal como servidor de envio. Descartada porque depende de credenciais pessoais ou de "senha de app", tem limites baixos e restritivos, é mais sujeita a bloqueios e mistura a identidade da EasyFood com uma conta pessoal.
2. **Resend:** API moderna e simples, com plano gratuito de 3.000 e-mails por mês, limitado a 100 por dia. Descartada porque, sem um domínio próprio verificado, só permite enviar para o dono da conta, o que impede enviar a confirmação para usuários reais.
3. **MailerSend:** Plano gratuito de 500 e-mails por mês, com limite de 100 por dia, e domínio de teste restrito a poucos e-mails. Descartada pelo volume mensal baixo e pelo mesmo requisito de domínio próprio para uso real.
4. **SendGrid e Mailgun:** Tradicionais no mercado, mas atualmente oferecem apenas período de teste, sem plano gratuito permanente. Descartadas por não atenderem ao requisito de custo zero.
5. **Brevo (antiga Sendinblue):** Plano gratuito permanente de 300 e-mails por dia, com API REST de e-mails transacionais incluída e verificação de remetente por e-mail, sem exigir domínio próprio para começar.

## Decisão
Escolhemos adotar a **Brevo** como provedor de e-mail, integrada por sua **API REST** usando o `fetch` nativo do Node.js, com as seguintes regras:

* **Serviço compartilhado:** Todo o envio fica isolado em `src/modules/shared/email.service.js`, que expõe a função `sendEmail({ to, toName, subject, header, body, footer })`. Nenhum outro módulo conhece a Brevo; para trocar de provedor, basta alterar a chamada `fetch` dentro desse arquivo.
* **Sem biblioteca adicional:** A integração usa o `fetch` do Node.js 18+, portanto nenhuma dependência nova foi adicionada ao `package.json`.
* **Configuração por ambiente:** A chave de API e os dados do remetente ficam no `.env` (`EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `APP_URL` e `COMMERCIAL_EMAIL`), documentados no `.env.example` e nunca versionados.
* **Remetente fixo, destinatário variável:** O remetente (`EMAIL_FROM`) é sempre o endereço verificado da EasyFood. O destinatário (`to`) vem do banco, ou seja, do e-mail de cada usuário.
* **Confirmação de e-mail:** No cadastro, a API gera um token aleatório, grava apenas o **hash SHA-256** dele no banco (`verifyToken`) com validade de 24 horas (`verifyTokenExp`) e envia por e-mail um link para `GET /auth/confirm-email?token=...`. O link só funciona uma vez e, ao ser usado, marca `emailVerified` como verdadeiro e apaga o token.
* **E-mail como ação secundária:** A operação principal (criar usuário ou restaurante) acontece primeiro. O envio fica em um `try/catch`, e qualquer falha é apenas registrada no terminal, sem alterar a resposta da API.
* **Proteção do conteúdo:** Dados informados por usuários (como nome do restaurante) passam por `escapeHtml()` antes de entrar no HTML do e-mail.
* **Login não bloqueado:** Nesta versão, a confirmação do e-mail não é exigida para entrar no sistema.

## Justificativa
A Brevo foi a única opção que atendeu ao mesmo tempo aos três critérios do projeto: tem plano **gratuito permanente**, oferece **API** e permite **enviar para qualquer destinatário** sem a compra de um domínio. Seu limite diário (300 e-mails) é maior que o das alternativas gratuitas pesquisadas e é suficiente para o volume do projeto. Usar HTTP puro mantém o projeto sem dependências novas e deixa o serviço fácil de substituir, o que preserva a arquitetura em camadas. Isolar o envio em `shared` segue o mesmo princípio dos ADRs anteriores: os módulos de negócio dependem de uma interface simples (`sendEmail`), e não de um fornecedor. Guardar apenas o hash do token e dar a ele validade curta evita que um vazamento do banco exponha links de confirmação válidos. Tratar o e-mail como ação secundária impede que uma instabilidade de um serviço externo derrube funcionalidades essenciais.

## Consequências Positivas
* **Custo zero e sem novas dependências:** Nada é pago e o `package.json` permanece o mesmo.
* **Baixo acoplamento:** A troca de provedor afeta um único arquivo.
* **Cadastro resiliente:** Usuários e restaurantes continuam sendo salvos mesmo quando o envio falha.
* **Reaproveitamento:** A mesma função `sendEmail()` atende confirmação de cadastro, boas-vindas e aviso comercial, e serve para novos usos (por exemplo, recuperação de senha).
* **Rastreabilidade:** O painel da Brevo mostra o ciclo de cada e-mail (enviado, entregue, aberto e clicado), o que facilita o diagnóstico.

## Consequências Negativas
* **Limite diário:** O plano gratuito permite 300 e-mails por dia. Cada cadastro gasta 1 e cada restaurante cadastrado gasta até 2, e acima do limite os envios falham (sem afetar o cadastro).
* **Reputação do remetente:** O remetente atual é um endereço de e-mail gratuito (Gmail). A própria Brevo sinaliza "Freemail domain is not recommended" e exibe o remetente com outro domínio, o que pode levar os e-mails ao spam. Para uso real, é necessário um domínio próprio autenticado (SPF, DKIM e DMARC).
* **Dependência externa:** O envio depende da disponibilidade e das regras da Brevo, que podem mudar (planos gratuitos de provedores já foram alterados ou removidos).
* **Sem reenvio e sem fila:** Se o e-mail falhar, o usuário fica sem o link e a API não tenta de novo, não há rota para reenviar a confirmação e o envio é feito de forma síncrona, dentro da requisição.
* **Confirmação não obrigatória:** Como o login não exige e-mail confirmado, o campo `emailVerified` ainda não protege nenhuma funcionalidade.
* **Aviso comercial fixo:** O destinatário do aviso interno vem de uma variável de ambiente, e não de uma configuração do sistema.

## Critérios de Revisão
Esta decisão deverá ser reavaliada quando a EasyFood for para **produção** ou ultrapassar os **300 e-mails por dia**, momento em que deverão ser considerados um plano pago ou outro provedor, um **domínio próprio autenticado** e o envio por **fila ou em segundo plano**. Também deverá ser revista se o provedor alterar ou remover o plano gratuito, se surgir a necessidade de **bloquear o login até a confirmação do e-mail**, de **reenvio de confirmação**, **recuperação de senha** ou **modelos de e-mail gerenciados**, ou se a taxa de e-mails indo para o spam comprometer a entrega das confirmações.