# Roteiro de Instalação e Deploy (VPS + Supabase Externo)

Este documento detalha o processo de migração do projeto Bivvo para uma infraestrutura externa.

## 1. Requisitos Prévios

- **VPS:** Ubuntu 22.04 LTS (recomendado) com acesso root/sudo.
- **Domínio:** Um domínio apontado para o IP da VPS (registros A).
- **Supabase:** Uma conta no [Supabase.com](https://supabase.com) com um projeto novo criado.
- **Asaas:** Acesso à conta Asaas para configurar API Key e Webhooks.

---

## 2. Preparação do Banco de Dados (Supabase Externo)

1. No painel do Supabase, acesse **SQL Editor**.
2. Execute o conteúdo do arquivo `database_schema.sql` (que será gerado na pasta `new_deploy`).
3. Vá em **Project Settings > API** e anote:
   - `Project URL`
   - `Anon Key`
   - `Service Role Key` (mantenha em sigilo)

---

## 3. Configuração das Edge Functions no Supabase Externo

As funções precisam ser publicadas no seu novo projeto Supabase.

1. Instale o CLI do Supabase localmente:
   ```bash
   npm install supabase --save-dev
   ```
2. Faça login e vincule ao projeto:
   ```bash
   npx supabase login
   npx supabase link --project-ref <seu-project-id>
   ```
3. Configure as variáveis de ambiente no Supabase:
   ```bash
   npx supabase secrets set ASAAS_API_KEY="sua_chave"
   npx supabase secrets set ASAAS_BASE_URL="https://api.asaas.com/v3"
   npx supabase secrets set ASAAS_WEBHOOK_SECRET="seu_token_webhook"
   ```
4. Faça o deploy:
   ```bash
   npx supabase functions deploy admin-api
   npx supabase functions deploy create-subscription
   npx supabase functions deploy process-payment
   npx supabase functions deploy asaas-webhook
   ```

---

## 4. Configuração do Frontend na VPS

### Instalação de Dependências
Na VPS, instale o Node.js e Nginx:
```bash
sudo apt update
sudo apt install -y nodejs npm nginx
sudo npm install -g n
sudo n stable
```

### Build do Projeto
1. Clone o repositório na VPS.
2. Crie o arquivo `.env` na raiz:
   ```env
   VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<sua-anon-key>
   ```
3. Instale e gere o build:
   ```bash
   npm install
   npm run build
   ```
   Os arquivos serão gerados na pasta `dist/`.

---

## 5. Configuração do Nginx

Crie um arquivo de configuração: `/etc/nginx/sites-available/bivvo`

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    root /caminho/para/projeto/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Ative o site e instale o SSL (Certbot):
```bash
sudo ln -s /etc/nginx/sites-available/bivvo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## 6. Configuração Final no Asaas

1. Vá em **Minha Conta > Integrações > Webhooks**.
2. Ative o Webhook de Cobranças.
3. URL do Webhook: `https://<seu-projeto>.supabase.co/functions/v1/asaas-webhook`
4. Token de Autenticação: O mesmo definido em `ASAAS_WEBHOOK_SECRET`.
5. Eventos recomendados: `Pagamento confirmado`, `Pagamento recebido`, `Assinatura removida`.
