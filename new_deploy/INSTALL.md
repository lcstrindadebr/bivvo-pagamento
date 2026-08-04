# 🚀 Guia Definitivo de Instalação - Bivvo

Este guia foi criado para que **qualquer pessoa**, mesmo sem conhecimento técnico, consiga colocar o sistema Bivvo no ar em um servidor externo (VPS).

O código-fonte oficial fica em: **https://github.com/lcstrindadebr/project-lovebug-launch.git**

---

## ⚡ Instalação Automática (RECOMENDADO)

Em **5 minutos** o sistema estará no ar. O instalador faz tudo sozinho:
atualiza o Ubuntu, instala Node.js + Nginx + Certbot, clona o repositório,
configura o `.env`, faz o build, configura o subdomínio e gera o SSL HTTPS.

### Pré-requisitos
1. **VPS Ubuntu 22.04 ou superior** (DigitalOcean, Hetzner, Contabo, etc.) com acesso root.
2. **Subdomínio** (ex: `app.seudominio.com.br`) apontando (registro A) para o IP da VPS.
3. **Projeto Backend (Supabase/Lovable Cloud)** já criado.
4. **Conta no Asaas** com API Key.

### Executar o instalador
Conecte na VPS via SSH e cole o comando abaixo. O script é configurado para acessar o repositório público sem solicitar senha:

```bash
curl -fsSL https://raw.githubusercontent.com/lcstrindadebr/project-lovebug-launch/main/new_deploy/auto_install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh
```

O script vai perguntar:
- 🌐 Subdomínio
- 📧 Seu e-mail (para o SSL)
- 🔗 URL do Supabase
- 🔑 Chave anon do Supabase
- 💳 Dados do Asaas (opcional, podem ser inseridos depois)

Pronto. Ao final, o site estará rodando em `https://seu-subdominio` com HTTPS ativo.

---

## 🧩 Pós-Instalação (Backend)

O instalador deixa a aplicação no ar, mas o **backend** precisa ser configurado:

### 1️⃣ Criar / atualizar as tabelas do banco
O `auto_install.sh` (opção 3) pode fazer isso automaticamente se você tiver a Connection String do banco.
Caso prefira fazer manualmente no painel (SQL Editor):
1. Execute `new_deploy/database_schema.sql` (Schema base).
2. Execute as migrations em `new_deploy/migrations/` em ordem numérica. A migração `011_unified_security_policy.sql` é fundamental para garantir o acesso do Admin e a segurança das tabelas.

### 2️⃣ Cadastrar os Secrets (Asaas)
Vá em **Edge Functions → Secrets** e adicione:

| Nome | Valor |
|------|-------|
| `ASAAS_API_KEY` | Sua chave de API do Asaas |
| `ASAAS_BASE_URL` | `https://api.asaas.com/v3` (produção) |
| `ASAAS_WEBHOOK_SECRET` | Um token de sua escolha para validar os webhooks |

### 3️⃣ Publicar as Edge Functions
As funções na pasta `new_deploy/functions/` já estão prontas para deploy. Você pode publicá-las usando a opção 3 do `auto_install.sh` ou via Supabase CLI:

```bash
npx supabase functions deploy --no-verify-jwt
```

---

## 🔧 Manutenção e Atualização

O script de instalação também serve para manutenção. Rode novamente:

```bash
sudo ./install.sh
```

Opções disponíveis:
1. **Manutenção:** Alterar credenciais ou trocar o subdomínio.
2. **Atualizar Código:** Faz um `git pull` e gera um novo build.
3. **Atualizar Supabase:** Publica Edge Functions e aplica migrations SQL automaticamente.
4. **Reinstalação:** Limpa tudo e reinstala do zero.

---

## 🔍 Resolução de problemas (Troubleshooting)

### Pedido de senha no Git
O instalador foi configurado para ignorar assistentes de credenciais (`-c credential.helper=`). Se ainda assim for solicitada senha, verifique se o repositório `https://github.com/lcstrindadebr/project-lovebug-launch.git` está acessível publicamente no seu navegador.

### Erro de RLS (Row-Level Security)
Se encontrar erros de permissão ao criar tarefas ou canais, certifique-se de que a migração `new_deploy/migrations/011_unified_security_policy.sql` foi aplicada com sucesso. Ela unifica as políticas de segurança para o usuário Admin.

---

✅ **Concluído!** Seu sistema Bivvo está pronto para escalar.