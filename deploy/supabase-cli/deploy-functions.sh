#!/bin/bash
# =============================================================================
# BIVVO CHECKOUT - SCRIPT DE DEPLOY DAS EDGE FUNCTIONS
# =============================================================================
# Este script facilita o deploy das Edge Functions para um Supabase externo
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Bivvo Checkout - Deploy Edge Functions${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado!${NC}"
    echo -e "${YELLOW}Instale com: npm install -g supabase${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI encontrado${NC}"

# Verificar login
echo ""
echo -e "${YELLOW}Verificando autenticação...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}Você precisa fazer login primeiro.${NC}"
    supabase login
fi
echo -e "${GREEN}✓ Autenticado${NC}"

# Solicitar Project ID se não estiver configurado
echo ""
read -p "Digite o Project Reference ID do Supabase: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Project ID é obrigatório!${NC}"
    exit 1
fi

# Linkar ao projeto
echo ""
echo -e "${YELLOW}Linkando ao projeto $PROJECT_ID...${NC}"
supabase link --project-ref "$PROJECT_ID"
echo -e "${GREEN}✓ Projeto linkado${NC}"

# Lista de funções para deploy
FUNCTIONS=(
    "process-payment"
    "create-subscription"
    "check-payment-status"
    "asaas-webhook"
)

# Deploy de cada função
echo ""
echo -e "${YELLOW}Iniciando deploy das Edge Functions...${NC}"
echo ""

for func in "${FUNCTIONS[@]}"; do
    echo -e "${YELLOW}→ Deployando $func...${NC}"
    if supabase functions deploy "$func" --no-verify-jwt; then
        echo -e "${GREEN}  ✓ $func deployado com sucesso${NC}"
    else
        echo -e "${RED}  ✗ Erro ao deployar $func${NC}"
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deploy concluído!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Configure os secrets no Supabase Dashboard:"
echo "   - ASAAS_API_KEY"
echo "   - ASAAS_BASE_URL"
echo "   - ASAAS_WEBHOOK_TOKEN (opcional)"
echo ""
echo "2. Configure o webhook no Asaas:"
echo "   URL: https://$PROJECT_ID.supabase.co/functions/v1/asaas-webhook"
echo ""
