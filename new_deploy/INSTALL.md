# 🚀 Guia Definitivo de Instalação - Bivvo

Este guia foi criado para que **qualquer pessoa**, mesmo sem conhecimento técnico avançado, consiga colocar o sistema Bivvo no ar em uma VPS própria com um banco de dados Supabase externo.

---

## 📋 Pré-requisitos
Antes de começar, você precisa ter:
1.  **Uma conta no [Supabase](https://supabase.com)** (Gratuita ou Pro).
2.  **Uma VPS** (Recomendamos Ubuntu 22.04 na DigitalOcean, Hetzner ou Contabo).
3.  **Um Domínio ou Subdomínio** (ex: `app.seudominio.com.br`) apontado para o IP da sua VPS.
4.  **Uma conta no [Asaas](https://asaas.com)** para receber pagamentos.

---

## 🛠️ PASSO 1: Configurando o Supabase (O Coração)

1.  **Crie um novo projeto** no Supabase.
2.  **Banco de Dados:**
    *   No menu lateral, clique em **SQL Editor**.
    *   Clique em **New Query**.
    *   Abra o arquivo `database_schema.sql` (nesta pasta), copie todo o texto e cole no editor do Supabase.
    *   Clique em **Run**. Isso criará todas as tabelas e regras de segurança.
3.  **Pegue suas chaves:**
    *   Vá em **Project Settings > API**.
    *   Copie a `Project URL` e a `anon public` key. Você precisará delas no Passo 4.

---

## ⚡ PASSO 2: Edge Functions (A Inteligência)

As Edge Functions processam os pagamentos e webhooks. Elas podem ser instaladas manualmente pelo painel ou via terminal.

### 🔑 Configurando as Variáveis (OBRIGATÓRIO)
Antes de qualquer coisa, você deve cadastrar as chaves do Asaas no Supabase:
1.  No painel do Supabase, vá em **Edge Functions > Secrets**.
2.  Adicione estas 3 chaves exatamente assim:
    *   `ASAAS_API_KEY`: Sua chave de API do Asaas.
    *   `ASAAS_BASE_URL`: `https://api.asaas.com/v3`
    *   `ASAAS_WEBHOOK_SECRET`: Uma senha/token que você inventar (anote-a para o Passo 7).

### Opção A: Instalação Manual (Pelo Navegador)
1.  No painel do Supabase, vá em **Edge Functions** e clique em **Create a New Function**.
2.  Dê o nome exato da pasta da função (ex: `asaas-webhook`).
3.  Abra a pasta `new_deploy/functions/asaas-webhook` no seu computador.
4.  Abra o arquivo `index.ts`, copie todo o código e cole no editor do Supabase.
5.  **Repita** para todas as funções na pasta `functions`.
    *   *Nota: Funções que usam a pasta `_shared` podem precisar de ajuste nos caminhos se instaladas via navegador. Recomendamos a Opção B para evitar erros.*

### Opção B: Instalação via Terminal (Recomendado/Rápido)
1.  Abra o terminal na pasta `new_deploy` no seu computador e execute:
    ```bash
    npm install -g supabase
    supabase login
    supabase link --project-ref <SEU_PROJECT_ID>
    supabase functions deploy --all
    ```

---

## 💻 PASSO 3: Configurando a VPS (O Servidor)

1.  Acesse sua VPS via Terminal (SSH).
2.  Envie o arquivo `vps_setup.sh` para a VPS ou execute o comando abaixo para preparar tudo automaticamente:
    ```bash
    curl -s https://raw.githubusercontent.com/seu-repo/vps_setup.sh | bash
    ```
    *(Ou simplesmente instale manualmente: `sudo apt update && sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx`)*

---

## 📦 PASSO 4: Preparando a Aplicação (O Site)

No seu computador local:
1.  Crie um arquivo chamado `.env` na raiz do projeto Bivvo.
2.  Coloque as informações do Supabase que você pegou no Passo 1:
    ```env
    VITE_SUPABASE_URL=https://seuid.supabase.co
    VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
    ```
3.  Gere os arquivos do site:
    ```bash
    npm install
    npm run build
    ```
4.  Isso criará uma pasta chamada `dist`. Envie o conteúdo dessa pasta para a VPS no caminho `/var/www/bivvo`.

---

## 🌐 PASSO 5: Configurando o Subdomínio e Nginx

Agora vamos dizer à VPS para mostrar o site quando alguém acessar seu subdomínio.

1.  Na VPS, crie o arquivo de configuração:
    ```bash
    sudo nano /etc/nginx/sites-available/bivvo
    ```
2.  Cole o conteúdo abaixo (substitua `app.seudominio.com.br` pelo seu subdomínio):
    ```nginx
    server {
        listen 80;
        server_name app.seudominio.com.br;

        root /var/www/bivvo;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # Segurança básica
        location ~ /\.ht {
            deny all;
        }
    }
    ```
3.  Ative a configuração:
    ```bash
    sudo ln -s /etc/nginx/sites-available/bivvo /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

---

## 🔒 PASSO 6: Ativando o SSL (HTTPS Seguro)

Para que o site tenha o cadeado de segurança:
1.  Execute na VPS:
    ```bash
    sudo certbot --nginx -d app.seudominio.com.br
    ```
2.  Siga as instruções (digite seu e-mail e aceite os termos). O Certbot configurará tudo sozinho.

---

## 🔗 PASSO 7: Conectando com o Asaas (Webhooks)

Para que o sistema saiba quando um boleto ou PIX foi pago:
1.  No painel do Asaas, vá em **Minha Conta > Integrações > Webhooks**.
2.  **URL do Webhook:** `https://seuid.supabase.co/functions/v1/asaas-webhook`
3.  **Token:** Use o mesmo que você definiu no comando `supabase secrets set ASAAS_WEBHOOK_SECRET`.
4.  **Eventos:** Marque `Pagamento Confirmado`, `Pagamento Recebido` e `Assinatura Cancelada`.

---

## ✅ Concluído!
Seu sistema agora está rodando em `https://app.seudominio.com.br`.

### Dicas de Manutenção:
*   **Logs:** Se algo não funcionar, veja os erros com: `sudo tail -f /var/log/nginx/error.log`
*   **Atualização:** Para atualizar o site, basta fazer um novo `npm run build` e substituir os arquivos na pasta `/var/www/bivvo`.
