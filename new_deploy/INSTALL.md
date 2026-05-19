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

Como a exportação é manual, os arquivos das funções já estão organizados na pasta `new_deploy/functions`.

### Passo a Passo para Criar as Funções Manualmente:

1. No painel do Supabase, vá em **Edge Functions**.
2. Clique em **Create a New Function** para cada uma das seguintes:
   - `admin-api`
   - `affiliate-api`
   - `asaas-webhook`
   - `check-payment-status`
   - `create-subscription`
   - `process-payment`

3. Para cada função criada:
   - Copie o conteúdo do arquivo `index.ts` correspondente dentro de `new_deploy/functions/<nome-da-funcao>/`.
   - **Importante:** Se a função importar arquivos de `_shared`, você precisará garantir que esses arquivos também existam no ambiente de execução ou ajustar os caminhos para URLs absolutas se necessário (o padrão CLI gerencia isso, mas na criação manual pelo painel, prefira usar o CLI conforme abaixo).

### Recomendação: Deploy via CLI (Mais Seguro e Rápido)

Mesmo sendo manual, a melhor forma é usar o CLI para evitar erros de importação:

1. Na raiz da pasta `new_deploy`, certifique-se de que a estrutura `functions/` está presente.
2. Inicialize o projeto Supabase localmente (se ainda não fez):
   ```bash
   npx supabase init
   ```
3. Vincule ao seu novo projeto:
   ```bash
   npx supabase link --project-ref <seu-project-id>
   ```
4. Configure as variáveis de ambiente necessárias:
   ```bash
   npx supabase secrets set ASAAS_API_KEY="sua_chave"
   npx supabase secrets set ASAAS_BASE_URL="https://api.asaas.com/v3"
   npx supabase secrets set ASAAS_WEBHOOK_SECRET="seu_token_webhook"
   ```
5. Faça o deploy de todas as funções de uma vez:
   ```bash
   npx supabase functions deploy --all
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

## 5. Configuração do Domínio com Nginx

O Nginx atuará como o servidor web principal, servindo os arquivos estáticos do frontend e garantindo que as rotas do React (SPA) funcionem corretamente sob o seu domínio.

### Criar Configuração do Site
Crie o arquivo: `/etc/nginx/sites-available/bivvo`

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    # Caminho onde você fez o build do projeto (item 4)
    root /var/www/bivvo/dist;
    index index.html;

    # Suporte a rotas do React (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logs de acesso
    access_log /var/log/nginx/bivvo_access.log;
    error_log /var/log/nginx/bivvo_error.log;

    # Otimização de Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Ativar o Domínio e Configurar SSL
Execute os comandos abaixo na VPS:

1. **Habilitar o site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/bivvo /etc/nginx/sites-enabled/
   ```

2. **Testar e reiniciar o Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

3. **Instalar Certificado SSL (HTTPS Gratuito):**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
   ```
   *Siga as instruções na tela para redirecionar todo o tráfego HTTP para HTTPS.*

---

## 6. Configuração Final no Asaas

1. Vá em **Minha Conta > Integrações > Webhooks**.
2. Ative o Webhook de Cobranças.
3. URL do Webhook: `https://<seu-projeto-supabase>.supabase.co/functions/v1/asaas-webhook`
4. Token de Autenticação: Use o mesmo valor que você definiu em `ASAAS_WEBHOOK_SECRET` no Supabase.
5. Selecione os eventos: `Pagamento confirmado`, `Pagamento recebido`, `Assinatura removida`.

