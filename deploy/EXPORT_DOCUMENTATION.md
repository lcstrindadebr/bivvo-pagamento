# 📦 Documentação de Exportação - Bivvo Checkout

Este guia completo explica como exportar o projeto Bivvo Checkout para qualquer infraestrutura, com foco em **Portainer + Traefik** e **Supabase externo**.

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Pré-requisitos](#pré-requisitos)
3. [Exportação para Supabase Externo](#exportação-para-supabase-externo)
4. [Deploy com Docker](#deploy-com-docker)
5. [Deploy com Portainer + Traefik](#deploy-com-portainer--traefik)
6. [Configuração das Edge Functions](#configuração-das-edge-functions)
7. [Configuração do Webhook Asaas](#configuração-do-webhook-asaas)
8. [Variáveis de Ambiente](#variáveis-de-ambiente)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    (React + Vite + Nginx)                       │
│                      Docker Container                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS (Supabase SDK)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Externo)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   PostgreSQL    │  │  Edge Functions │  │   Auth (opt)   │  │
│  │   - users       │  │  - process-     │  │                │  │
│  │   - payments    │  │    payment      │  │                │  │
│  │                 │  │  - create-      │  │                │  │
│  │                 │  │    subscription │  │                │  │
│  │                 │  │  - check-       │  │                │  │
│  │                 │  │    payment-     │  │                │  │
│  │                 │  │    status       │  │                │  │
│  │                 │  │  - asaas-       │  │                │  │
│  │                 │  │    webhook      │  │                │  │
│  └─────────────────┘  └────────┬────────┘  └────────────────┘  │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 │ API
                                 ▼
                    ┌────────────────────────┐
                    │    ASAAS (Gateway)     │
                    │    - Pagamentos        │
                    │    - Webhooks          │
                    └────────────────────────┘
```

---

## ✅ Pré-requisitos

### Para Supabase Externo:
- [ ] Conta no [Supabase](https://supabase.com) (gratuito para começar)
- [ ] Projeto criado no Supabase

### Para Docker/Portainer:
- [ ] Docker e Docker Compose instalados
- [ ] Servidor com acesso SSH
- [ ] (Opcional) Portainer instalado
- [ ] (Opcional) Traefik configurado como reverse proxy

### Para Asaas:
- [ ] Conta no [Asaas](https://asaas.com) (sandbox ou produção)
- [ ] API Key gerada

---

## 🗄️ Exportação para Supabase Externo

### Passo 1: Criar Projeto no Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em "New Project"
3. Preencha:
   - **Name**: `bivvo-checkout` (ou seu nome)
   - **Database Password**: Anote em local seguro!
   - **Region**: Escolha o mais próximo dos seus usuários

### Passo 2: Executar Migrations

1. No dashboard do Supabase, vá em **SQL Editor**
2. Execute os arquivos na ordem:

```sql
-- ARQUIVO 1: deploy/database/migrations/001_initial_schema.sql
-- Cole e execute todo o conteúdo

-- ARQUIVO 2: deploy/database/migrations/002_security_policies.sql  
-- Cole e execute todo o conteúdo
```

### Passo 3: Obter Credenciais

No Supabase Dashboard, vá em **Settings > API** e copie:

| Campo | Variável de Ambiente |
|-------|---------------------|
| Project URL | `VITE_SUPABASE_URL` |
| anon public | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Project Reference ID | `VITE_SUPABASE_PROJECT_ID` |
| service_role secret | (usar nas Edge Functions) |

### Passo 4: Deploy das Edge Functions

#### Opção A: Via Supabase CLI (Recomendado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar ao projeto
supabase link --project-ref SEU_PROJECT_ID

# Deploy das funções
supabase functions deploy process-payment
supabase functions deploy create-subscription
supabase functions deploy check-payment-status
supabase functions deploy asaas-webhook
```

#### Opção B: Via Dashboard

1. Vá em **Edge Functions** no dashboard
2. Para cada função em `supabase/functions/`:
   - Clique em "New Function"
   - Cole o código do `index.ts`
   - Configure `verify_jwt = false`

### Passo 5: Configurar Secrets das Edge Functions

No Supabase Dashboard, vá em **Settings > Edge Functions > Secrets**:

| Nome | Valor |
|------|-------|
| `ASAAS_API_KEY` | Sua API Key do Asaas |
| `ASAAS_BASE_URL` | `https://api.asaas.com/v3` (prod) ou `https://sandbox.asaas.com/api/v3` |
| `ASAAS_WEBHOOK_TOKEN` | (Opcional) Token para validar webhooks |

---

## 🐳 Deploy com Docker

### Desenvolvimento Local

```bash
# Clonar repositório
git clone <seu-repo>
cd bivvo-checkout

# Copiar e configurar variáveis
cp deploy/docker/.env.example deploy/docker/.env
nano deploy/docker/.env  # Editar com seus valores

# Build e run
cd deploy/docker
docker-compose up -d --build

# Acessar em http://localhost:3000
```

### Build Manual

```bash
# Build da imagem
docker build -f deploy/docker/Dockerfile -t bivvo-checkout:latest \
  --build-arg VITE_SUPABASE_URL=https://seu-projeto.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_key \
  --build-arg VITE_SUPABASE_PROJECT_ID=seu_project_id \
  .

# Run
docker run -d -p 80:80 --name bivvo-checkout bivvo-checkout:latest
```

---

## 🚀 Deploy com Portainer + Traefik

### Passo 1: Preparar Rede do Traefik

Certifique-se de que a rede `traefik-public` existe:

```bash
docker network create traefik-public
```

### Passo 2: Deploy via Portainer

1. No Portainer, vá em **Stacks > Add Stack**
2. Nome: `bivvo-checkout`
3. Cole o conteúdo de `deploy/docker/docker-compose.traefik.yml`
4. Configure as variáveis de ambiente:

| Variável | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | https://seu-projeto.supabase.co |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | eyJhbGciOiJIUzI1... |
| `VITE_SUPABASE_PROJECT_ID` | seu-project-id |
| `DOMAIN` | checkout.seudominio.com.br |

5. Clique em **Deploy the stack**

### Passo 3: Configurar DNS

Aponte seu domínio para o IP do servidor:

```
checkout.seudominio.com.br  →  IP_DO_SERVIDOR
```

### Verificar Deploy

```bash
# Verificar container rodando
docker ps | grep bivvo

# Verificar logs
docker logs bivvo-frontend

# Testar health check
curl http://localhost/health
```

---

## ⚡ Configuração das Edge Functions

### Estrutura das Funções

```
supabase/functions/
├── process-payment/      # Processa pagamento com cartão
│   └── index.ts
├── create-subscription/  # Cria assinatura PIX/Boleto
│   └── index.ts
├── check-payment-status/ # Verifica status do pagamento
│   └── index.ts
└── asaas-webhook/        # Recebe notificações do Asaas
    └── index.ts
```

### Preços dos Planos

Os preços são definidos no servidor (Edge Functions) para segurança:

```typescript
// Em process-payment/index.ts e create-subscription/index.ts
const PLAN_PRICES: Record<string, number> = {
  standard: 147.90,
  silver: 287.90,
  pro: 429.90,
};
```

**⚠️ Importante**: Se alterar os preços, atualize em ambas as funções!

---

## 🔔 Configuração do Webhook Asaas

### URL do Webhook

```
https://SEU_PROJECT_ID.supabase.co/functions/v1/asaas-webhook
```

### Configurar no Asaas

1. Acesse o painel do Asaas
2. Vá em **Integrações > Webhooks**
3. Configure:
   - **URL**: URL acima
   - **Eventos**: 
     - `PAYMENT_RECEIVED`
     - `PAYMENT_CONFIRMED`
     - `PAYMENT_OVERDUE`
   - **Envio**: Sequencial (recomendado)
   - **Token** (opcional): Configure o mesmo valor em `ASAAS_WEBHOOK_TOKEN`

### Eventos Suportados

| Evento Asaas | Status no Sistema |
|--------------|-------------------|
| `PAYMENT_RECEIVED` | `paid` |
| `PAYMENT_CONFIRMED` | `paid` |
| `PAYMENT_OVERDUE` | `overdue` |
| `PAYMENT_DELETED` | `cancelled` |
| `PAYMENT_REFUNDED` | `refunded` |
| `PAYMENT_CHARGEBACK_REQUESTED` | `chargeback` |

---

## 🔐 Variáveis de Ambiente

### Frontend (.env)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1...
VITE_SUPABASE_PROJECT_ID=seu-project-id
```

### Edge Functions (Supabase Secrets)

| Secret | Descrição |
|--------|-----------|
| `ASAAS_API_KEY` | API Key do Asaas |
| `ASAAS_BASE_URL` | URL base da API (prod ou sandbox) |
| `ASAAS_WEBHOOK_TOKEN` | (Opcional) Token para validar webhooks |
| `SUPABASE_URL` | ✅ Configurado automaticamente |
| `SUPABASE_ANON_KEY` | ✅ Configurado automaticamente |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Configurado automaticamente |

---

## 🔧 Troubleshooting

### Container não inicia

```bash
# Verificar logs
docker logs bivvo-frontend

# Verificar se a porta está em uso
netstat -tlnp | grep 80
```

### Edge Functions retornam erro 500

1. Verificar secrets configurados:
   ```bash
   supabase secrets list
   ```

2. Verificar logs:
   ```bash
   supabase functions logs process-payment
   ```

### Webhook não está funcionando

1. Testar endpoint manualmente:
   ```bash
   curl -X POST https://seu-projeto.supabase.co/functions/v1/asaas-webhook \
     -H "Content-Type: application/json" \
     -d '{"event": "PAYMENT_RECEIVED", "payment": {"id": "test"}}'
   ```

2. Verificar logs do Asaas (no painel de webhooks)

### Pagamento criado mas não atualiza status

1. Verificar se o webhook está configurado no Asaas
2. Verificar se a URL do webhook está correta
3. Verificar logs da Edge Function `asaas-webhook`

---

## 📁 Estrutura de Arquivos para Deploy

```
deploy/
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql      # Estrutura do banco
│       └── 002_security_policies.sql   # Políticas RLS
├── docker/
│   ├── Dockerfile                      # Build de produção
│   ├── nginx.conf                      # Config do Nginx
│   ├── docker-compose.yml              # Dev local
│   ├── docker-compose.traefik.yml      # Produção com Traefik
│   ├── deploy.sh                       # Script de deploy automatizado
│   └── .env.example                    # Template de variáveis
├── edge-functions/                     # ⭐ NOVO: Edge Functions para exportação
│   ├── create-subscription/            # Criação de assinaturas PIX/Boleto
│   │   └── index.ts
│   ├── process-payment/                # Pagamento com cartão
│   │   └── index.ts
│   ├── check-payment-status/           # Verificação de status
│   │   └── index.ts
│   ├── asaas-webhook/                  # Webhook do Asaas
│   │   └── index.ts
│   └── README.md                       # Documentação das funções
├── supabase-cli/
│   ├── deploy-functions.sh             # Deploy automatizado
│   └── setup-secrets.sh                # Configuração de secrets
└── EXPORT_DOCUMENTATION.md             # Este arquivo
```

---

## 🔄 Atualizações das Edge Functions

### v1.1.0 - Fix: Cliente Removido do Asaas

As funções `create-subscription` e `process-payment` agora detectam automaticamente quando um cliente foi removido do Asaas e recriam o cliente antes de tentar a operação novamente.

**Problema resolvido**: Erro "Não é possível criar uma cobrança para um cliente removido"

**Como funciona**:
1. A função tenta criar a assinatura/pagamento
2. Se receber erro de "cliente removido", automaticamente:
   - Cria um novo cliente no Asaas
   - Atualiza o `asaas_customer_id` no banco de dados
   - Tenta novamente a operação

**Arquivos atualizados**:
- `deploy/edge-functions/create-subscription/index.ts`
- `deploy/edge-functions/process-payment/index.ts`

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs (Docker e Supabase)
2. Confirme que todas as variáveis de ambiente estão configuradas
3. Teste cada componente isoladamente
4. Verifique se as Edge Functions estão deployadas e funcionando

---

**Última atualização**: Fevereiro 2026
