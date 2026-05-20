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

### 1️⃣ Criar as tabelas do banco
- No painel do Supabase, abra **SQL Editor → New Query**
- Cole o conteúdo do arquivo `new_deploy/database_schema.sql`
- Clique em **Run**

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

## 🔄 Atualizar o site no futuro

```bash
cd /opt/bivvo-pagamento
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/bivvo/
```

---

## 🔧 Alternativa: Edge Functions via CLI (mais rápido)

Se preferir publicar as funções de uma vez:

```bash
cd /opt/bivvo-pagamento
npm install -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_ID
supabase functions deploy --all
```

---

✅ **Concluído!** Seu Bivvo está no ar.