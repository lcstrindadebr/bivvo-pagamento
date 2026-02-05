# Bivvo Checkout - Edge Functions para Exportação

Este diretório contém as Edge Functions prontas para deploy em um Supabase externo.

## 📁 Estrutura

```
edge-functions/
├── create-subscription/     # Criação de assinaturas PIX/Boleto
│   └── index.ts
├── process-payment/         # Processamento de pagamentos (cartão)
│   └── index.ts
├── check-payment-status/    # Verificação de status de pagamento
│   └── index.ts
├── asaas-webhook/          # Webhook para eventos do Asaas
│   └── index.ts
└── README.md               # Este arquivo
```

## 🚀 Deploy Manual via Supabase CLI

### Pré-requisitos

1. **Supabase CLI instalado**
   ```bash
   npm install -g supabase
   ```

2. **Login no Supabase**
   ```bash
   supabase login
   ```

3. **Link ao projeto**
   ```bash
   supabase link --project-ref SEU_PROJECT_ID
   ```

### Deploy das Functions

```bash
# Deploy de todas as functions
supabase functions deploy create-subscription --no-verify-jwt
supabase functions deploy process-payment --no-verify-jwt
supabase functions deploy check-payment-status --no-verify-jwt
supabase functions deploy asaas-webhook --no-verify-jwt
```

### Configuração de Secrets

```bash
# Configurar secrets obrigatórios
supabase secrets set ASAAS_API_KEY="sua_api_key_aqui"
supabase secrets set ASAAS_BASE_URL="https://api.asaas.com/v3"

# Opcional: Token para validar webhooks
supabase secrets set ASAAS_WEBHOOK_TOKEN="seu_token_webhook"
```

## 📋 Passo a Passo Completo

### 1. Copiar Functions para o Projeto Supabase

```bash
# No diretório do seu projeto Supabase externo
mkdir -p supabase/functions

# Copiar cada function
cp -r deploy/edge-functions/create-subscription supabase/functions/
cp -r deploy/edge-functions/process-payment supabase/functions/
cp -r deploy/edge-functions/check-payment-status supabase/functions/
cp -r deploy/edge-functions/asaas-webhook supabase/functions/
```

### 2. Configurar config.toml

Adicione ao seu `supabase/config.toml`:

```toml
[functions.create-subscription]
verify_jwt = false

[functions.process-payment]
verify_jwt = false

[functions.check-payment-status]
verify_jwt = false

[functions.asaas-webhook]
verify_jwt = false
```

### 3. Deploy

```bash
# Deploy de todas as functions de uma vez
supabase functions deploy
```

### 4. Verificar Deploy

```bash
# Listar functions deployadas
supabase functions list
```

### 5. Configurar Webhook no Asaas

Após o deploy, configure o webhook no painel do Asaas:

- **URL**: `https://SEU_PROJECT_ID.supabase.co/functions/v1/asaas-webhook`
- **Eventos**: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_DELETED
- **Tipo de Entrega**: Sequencial (recomendado)

## 🔄 Atualizações Recentes

### v1.1.0 - Fix: Cliente Removido do Asaas

A função `create-subscription` agora detecta automaticamente quando um cliente foi removido do Asaas e recria o cliente antes de tentar criar a assinatura novamente.

**Problema resolvido**: Erro "Não é possível criar uma cobrança para um cliente removido"

**Solução**: 
- Detecta o erro de cliente removido
- Cria automaticamente um novo cliente no Asaas
- Atualiza o `asaas_customer_id` no banco de dados
- Tenta novamente criar a assinatura

## 🧪 Testando as Functions

### Teste Local

```bash
# Iniciar Supabase local
supabase start

# Servir functions localmente
supabase functions serve
```

### Teste de Endpoint

```bash
# Testar create-subscription
curl -X POST "https://SEU_PROJECT_ID.supabase.co/functions/v1/create-subscription" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "standard",
    "billingType": "PIX",
    "customerData": {
      "name": "Teste",
      "email": "teste@example.com",
      "cpf": "12345678909",
      "whatsapp": "11999999999",
      "billingName": "Teste",
      "cep": "01310100",
      "endereco": "Av Paulista",
      "numero": "1000",
      "bairro": "Bela Vista",
      "cidade": "São Paulo",
      "estado": "SP"
    }
  }'
```

## 📝 Logs e Debug

```bash
# Ver logs em tempo real
supabase functions logs create-subscription --tail

# Ver últimos logs
supabase functions logs create-subscription
```

## ⚠️ Troubleshooting

### Erro: "Missing Asaas configuration"
- Verifique se os secrets `ASAAS_API_KEY` e `ASAAS_BASE_URL` estão configurados
- Use `supabase secrets list` para verificar

### Erro: "Cliente removido"
- A versão atualizada da function já trata este caso automaticamente
- Se persistir, verifique os logs para mais detalhes

### Erro de CORS
- As functions já incluem headers CORS configurados
- Verifique se o domínio de origem está permitido
