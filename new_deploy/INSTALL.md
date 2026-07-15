# 🚀 Guia Definitivo de Instalação - Bivvo

Este guia foi criado para que **qualquer pessoa**, mesmo sem conhecimento técnico, consiga colocar o sistema Bivvo no ar.

O código-fonte oficial fica em: **https://github.com/lcstrindadebr/bivvo-pagamento**

---

## ⚡ Instalação Automática (RECOMENDADO)

Em **5 minutos** o sistema estará no ar. O instalador faz tudo sozinho:
atualiza o Ubuntu, instala Node.js + Nginx + Certbot, clona o repositório,
configura o `.env`, faz o build, configura o subdomínio e gera o SSL HTTPS.

### Pré-requisitos
1. **VPS Ubuntu 22.04** (DigitalOcean, Hetzner, Contabo, etc.) com acesso root.
2. **Subdomínio** (ex: `app.seudominio.com.br`) apontando (registro A) para o IP da VPS.
3. **Projeto Supabase** já criado (anote URL e chave `anon`).
4. **Conta no Asaas** com API Key.

### Executar o instalador
Conecte na VPS via SSH e cole:

```bash
curl -fsSL https://raw.githubusercontent.com/lcstrindadebr/bivvo-pagamento/main/new_deploy/auto_install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh
```

O script vai perguntar:
- 🌐 Subdomínio
- 📧 Seu e-mail (para o SSL)
- 🔗 URL do Supabase
- 🔑 Chave anon do Supabase

Pronto. Ao final, o site estará rodando em `https://seu-subdominio` com HTTPS ativo.

---

## 🧩 Pós-Instalação (3 passos manuais no Supabase)

O instalador deixa a aplicação no ar, mas o **backend (Supabase)** precisa ser configurado uma única vez no painel:

### 1️⃣ Criar / atualizar as tabelas do banco
- No painel do Supabase, abra **SQL Editor → New Query**
- **Instalação nova:** cole em ordem `new_deploy/database_schema.sql` → `migrations/003_new_features.sql` → `migrations/004_security_and_settings.sql` → `migrations/005_task_enhancements.sql` → `migrations/006_finance_metrics.sql`
- **Atualização de uma instância já existente:** rode apenas as migrations novas em ordem (`003` → `004` → `005` → `006`). Todas são idempotentes.
- Clique em **Run** após cada uma.

> 💡 `004_security_and_settings.sql` traz delegação de tarefas por admin, whitelist pública de settings e endurecimento de RLS.
> 💡 `005_task_enhancements.sql` adiciona ao Kanban: **log automático da data de conclusão** (`completed_at`), **subtarefas** (checklist dentro da tarefa) e o marcador **"Aguardando ação de terceiro"** visível nos cards.
> 💡 `006_finance_metrics.sql` cria índices em `expenses(date)` e `expenses(category)` para acelerar os cards do dashboard: **Despesas do Mês Vigente**, **Total Despesas (Mês)** e o novo **Cobranças em Atraso** (que substituiu o antigo "Total Cobranças").

### 2️⃣ Cadastrar os Secrets (Asaas)
Vá em **Edge Functions → Secrets** e adicione:

| Nome | Valor |
|------|-------|
| `ASAAS_API_KEY` | Sua chave de API do Asaas |
| `ASAAS_BASE_URL` | `https://api.asaas.com/v3` (produção) ou `https://sandbox.asaas.com/api/v3` |
| `ASAAS_WEBHOOK_SECRET` | Um token/senha que você inventar (anote para o passo 4) |

### 3️⃣ Publicar as Edge Functions manualmente
As funções agora são **autossuficientes** (não dependem de arquivos externos), o que permite copiar e colar diretamente no painel do Supabase.

Para cada função:
1. No Supabase, vá em **Edge Functions → Create a new function**
2. Dê o nome exato (ex: `process-payment`)
3. No repositório, abra o arquivo `new_deploy/functions/[NOME-DA-FUNÇÃO]/index.ts`
4. **Copie TODO o conteúdo** e cole no editor do Supabase.
5. Clique em **Deploy** ou **Save**.

Repita para: `asaas-webhook`, `process-payment`, `create-subscription`, `check-payment-status`, `admin-api`, `affiliate-api`.

### 4️⃣ Configurar o Webhook no Asaas
- Painel do Asaas → **Integrações → Webhooks**
- URL: `https://SEU-PROJETO.supabase.co/functions/v1/asaas-webhook`
- Token: o mesmo valor de `ASAAS_WEBHOOK_SECRET`
- Eventos: `Pagamento Confirmado`, `Pagamento Recebido`, `Assinatura Cancelada`

---

## 🔧 Manutenção e Atualização

O script de instalação também serve para manutenção. Se você precisar trocar credenciais ou atualizar o site, basta rodar o mesmo comando novamente:

```bash
sudo ./install.sh
```

Ele detectará que o sistema já está instalado e oferecerá as opções:
1. **Manutenção:** Alterar URL/Chave do Supabase, API Key do Asaas ou trocar o subdomínio (reconfigura Nginx e SSL).
2. **Atualizar Código:** Faz um `git pull` e gera um novo build automaticamente.
3. **Atualizar Supabase:** Publica automaticamente as Edge Functions e aplica o SQL do banco usando suas credenciais já salvas (requer um Access Token do Supabase, gerado em https://supabase.com/dashboard/account/tokens).
4. **Reinstalação:** Remove e instala tudo do zero.



---

## 🔧 Alternativa: Edge Functions via CLI (mais rápido)

Se preferir publicar as funções de uma vez pelo terminal (exige Docker):

```bash
cd /opt/bivvo-pagamento
# Siga as instruções para logar e linkar o projeto
npx supabase login
npx supabase link --project-ref SEU_PROJECT_ID
npx supabase functions deploy --all --no-verify-jwt
```

---

## 🗄️ Atualização de Schema e Migrations via CLI

Para atualizar o banco de dados (schema base + migrations incrementais) direto pelo terminal da VPS:

```bash
cd /opt/bivvo-pagamento

# Siga as instruções para logar e linkar o projeto
npx supabase login
npx supabase link --project-ref SEU_PROJECT_ID

# Publica todas as Edge Functions
npx supabase functions deploy --all --no-verify-jwt
```

Em seguida, aplique o SQL do banco (schema + migrations) usando `psql` (a `SUPABASE_DB_URL` fica no `.env` do projeto). A URL precisa ser a **connection string do banco**, começando com `postgresql://` ou `postgres://` — não use a URL pública da API nem a chave anon:

```bash
# Schema base (apenas para instalação nova; é idempotente)
psql --dbname="$SUPABASE_DB_URL" -f new_deploy/database_schema.sql

# Migrations incrementais em ordem
psql --dbname="$SUPABASE_DB_URL" -f new_deploy/migrations/003_new_features.sql
psql --dbname="$SUPABASE_DB_URL" -f new_deploy/migrations/004_security_and_settings.sql
psql --dbname="$SUPABASE_DB_URL" -f new_deploy/migrations/005_task_enhancements.sql
psql --dbname="$SUPABASE_DB_URL" -f new_deploy/migrations/006_finance_metrics.sql
```

Se aparecer erro tentando conectar no socket local `/var/run/postgresql/.s.PGSQL.5432`, a `SUPABASE_DB_URL` foi colada/salva em formato incorreto. Apague a linha `SUPABASE_DB_URL=` do arquivo `/opt/bivvo-pagamento/.env` e execute o instalador novamente, colando somente a connection string completa do banco.

> 💡 O opção **3 do `auto_install.sh` (Atualizar Supabase)** faz todos esses passos automaticamente (login + link + deploy + schema + migrations).



---

## 🔍 Resolução de problemas (Troubleshooting)

### Erro: "non-2xx status code" ou "Module not found"
Se ao tentar assinar aparecer o erro **non-2xx status code**:
1. Verifique se você cadastrou o **ASAAS_API_KEY** e o **ASAAS_BASE_URL** corretamente em **Edge Functions → Secrets** no painel do Supabase.
2. Certifique-se de que a URL no Asaas está correta (Produção vs Sandbox).
3. Se você copiou o código manualmente, certifique-se de que copiou o código da pasta `new_deploy/functions/`, pois eles são adaptados para funcionar sem arquivos externos.
4. Verifique os logs em **Edge Functions → [Nome da Função] → Logs** para ver o erro exato retornado pela API do Asaas.


---

✅ **Concluído!** Seu Bivvo está no ar.