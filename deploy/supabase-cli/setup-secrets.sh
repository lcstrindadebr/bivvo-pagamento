#!/bin/bash
# =============================================================================
# BIVVO CHECKOUT - CONFIGURAÇÃO DE SECRETS
# =============================================================================
# Este script facilita a configuração dos secrets no Supabase
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Bivvo Checkout - Setup Secrets${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado!${NC}"
    echo -e "${YELLOW}Instale com: npm install -g supabase${NC}"
    exit 1
fi

# Verificar se está linkado a um projeto
echo -e "${YELLOW}Verificando projeto linkado...${NC}"
if [ ! -f ".supabase/config.json" ] && [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${RED}❌ Nenhum projeto linkado!${NC}"
    echo -e "${YELLOW}Execute primeiro: supabase link --project-ref SEU_PROJECT_ID${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Projeto linkado${NC}"
echo ""

# Solicitar valores dos secrets
echo -e "${YELLOW}Configure os secrets do Asaas:${NC}"
echo ""

read -p "ASAAS_API_KEY: " ASAAS_API_KEY
if [ -z "$ASAAS_API_KEY" ]; then
    echo -e "${RED}❌ ASAAS_API_KEY é obrigatório!${NC}"
    exit 1
fi

echo ""
echo "Ambiente do Asaas:"
echo "  1) Produção (https://api.asaas.com/v3)"
echo "  2) Sandbox (https://sandbox.asaas.com/api/v3)"
read -p "Escolha [1/2]: " ASAAS_ENV

if [ "$ASAAS_ENV" = "1" ]; then
    ASAAS_BASE_URL="https://api.asaas.com/v3"
else
    ASAAS_BASE_URL="https://sandbox.asaas.com/api/v3"
fi

echo ""
read -p "ASAAS_WEBHOOK_TOKEN (opcional, pressione Enter para pular): " ASAAS_WEBHOOK_TOKEN

# Configurar secrets
echo ""
echo -e "${YELLOW}Configurando secrets...${NC}"

echo -e "${YELLOW}→ Configurando ASAAS_API_KEY...${NC}"
echo "$ASAAS_API_KEY" | supabase secrets set ASAAS_API_KEY
echo -e "${GREEN}  ✓ ASAAS_API_KEY configurado${NC}"

echo -e "${YELLOW}→ Configurando ASAAS_BASE_URL...${NC}"
echo "$ASAAS_BASE_URL" | supabase secrets set ASAAS_BASE_URL
echo -e "${GREEN}  ✓ ASAAS_BASE_URL configurado ($ASAAS_BASE_URL)${NC}"

if [ -n "$ASAAS_WEBHOOK_TOKEN" ]; then
    echo -e "${YELLOW}→ Configurando ASAAS_WEBHOOK_TOKEN...${NC}"
    echo "$ASAAS_WEBHOOK_TOKEN" | supabase secrets set ASAAS_WEBHOOK_TOKEN
    echo -e "${GREEN}  ✓ ASAAS_WEBHOOK_TOKEN configurado${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Secrets configurados com sucesso!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Listar secrets configurados
echo -e "${YELLOW}Secrets atualmente configurados:${NC}"
supabase secrets list
