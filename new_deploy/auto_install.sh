#!/bin/bash
# =============================================================================
# BIVVO - AUTO INSTALADOR E GERENCIADOR (VPS Ubuntu/Debian)
# =============================================================================
# Este script faz a instalação e a manutenção do sistema Bivvo.
#
# COMO USAR:
#   curl -fsSL https://raw.githubusercontent.com/lcstrindadebr/bivvo-pagamento/main/new_deploy/auto_install.sh -o install.sh
#   chmod +x install.sh
#   sudo ./install.sh
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_URL="https://github.com/lcstrindadebr/bivvo-pagamento.git"
APP_DIR="/opt/bivvo-pagamento"
WEB_DIR="/var/www/bivvo"

# -----------------------------------------------------------------------------
# Funções de Apoio
# -----------------------------------------------------------------------------
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ Execute como root: sudo ./auto_install.sh${NC}"
        exit 1
    fi
}

save_env() {
    cat > "$APP_DIR/.env" <<EOF
VITE_SUPABASE_URL=$SUPA_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPA_KEY
VITE_SUPABASE_PROJECT_ID=$SUPA_PROJECT_ID
EOF
    chmod 600 "$APP_DIR/.env"
    echo -e "${GREEN}✓ .env atualizado em $APP_DIR/.env${NC}"
}

save_secrets() {
    if [ -n "$ASAAS_API_KEY" ] || [ -n "$ASAAS_WEBHOOK_SECRET" ]; then
        cat > "$APP_DIR/supabase-secrets.env" <<EOF
# Secrets para cadastrar no Supabase em: Edge Functions → Secrets
ASAAS_API_KEY=$ASAAS_API_KEY
ASAAS_BASE_URL=$ASAAS_BASE_URL
ASAAS_WEBHOOK_SECRET=$ASAAS_WEBHOOK_SECRET
EOF
        chmod 600 "$APP_DIR/supabase-secrets.env"
        echo -e "${GREEN}✓ Arquivo de segredos atualizado em $APP_DIR/supabase-secrets.env${NC}"
    fi
}

config_nginx() {
    cat > "/etc/nginx/sites-available/bivvo" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $WEB_DIR;
    index index.html;

    # Proteção contra cache do index.html (solução definitiva para atualizações)
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    # Cache agressivo para assets estáticos (com hash no nome)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\.ht { deny all; }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;
}
EOF
    ln -sf /etc/nginx/sites-available/bivvo /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    echo -e "${GREEN}✓ Nginx configurado e cache limpo para $DOMAIN${NC}"
}

apply_ssl() {
    echo -e "${BLUE}━━━━━ Gerando certificado SSL ━━━━━${NC}"
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect || echo -e "${RED}⚠️ Erro ao gerar SSL. Verifique se o domínio aponta para este IP.${NC}"
}

run_build() {
    echo -e "${BLUE}━━━━━ Gerando Build ━━━━━${NC}"
    cd "$APP_DIR"
    
    # Limpeza de cache do npm se necessário (opcional, mas ajuda em erros de build)
    # npm cache clean --force 

    npm install
    npm run build
    mkdir -p "$WEB_DIR"
    
    echo -e "${YELLOW}Limpando diretório web e publicando novo build...${NC}"
    rm -rf "$WEB_DIR"/*
    cp -r "$APP_DIR/dist/"* "$WEB_DIR/"
    chown -R www-data:www-data "$WEB_DIR"
    
    # Recarrega o nginx para garantir que as mudanças sejam servidas e limpa cache
    systemctl reload nginx || systemctl restart nginx
    
    echo -e "${GREEN}✓ Build concluído. Cache do servidor limpo e Nginx atualizado.${NC}"
}

update_supabase_auto() {
    echo ""
    echo -e "${BLUE}━━━━━ ATUALIZANDO SUPABASE (FUNCTIONS + SCHEMA) ━━━━━${NC}"
    
    # Seguindo exatamente a sequência solicitada
    cd "/opt/bivvo-pagamento"

    echo -e "${BLUE}Autenticando no Supabase...${NC}"
    npx supabase login --token sbp_9f79cabdaa6c9a08eb09296951c6984d566037ac

    echo -e "${BLUE}Linkando projeto bcijktxnuzsatvhammpl...${NC}"
    npx supabase link --project-ref bcijktxnuzsatvhammpl --non-interactive || true

    # Atualiza o banco de dados se houver alterações no schema
    echo -e "${BLUE}Aplicando SQL de banco de dados...${NC}"
    if [ -f "new_deploy/database_schema.sql" ]; then
        npx supabase db execute --file "new_deploy/database_schema.sql" --project-ref bcijktxnuzsatvhammpl
        echo -e "${GREEN}✓ Banco de dados atualizado.${NC}"
    fi

    echo -e "${BLUE}Fazendo Deploy de Edge Functions...${NC}"
    if [ -d "supabase/functions" ]; then
        npx supabase functions deploy --no-verify-jwt
        echo -e "${GREEN}✓ Edge Functions publicadas.${NC}"
    fi

    echo -e "${GREEN}✓ Atualização do Supabase concluída!${NC}"
}

# -----------------------------------------------------------------------------
# Menu Principal
# -----------------------------------------------------------------------------
clear
echo -e "${BLUE}=============================================================${NC}"
echo -e "${BLUE}        🚀 BIVVO - GERENCIADOR E INSTALADOR 🚀              ${NC}"
echo -e "${BLUE}=============================================================${NC}"

check_root

if [ -d "$APP_DIR" ]; then
    echo -e "${GREEN}✓ Instalação detectada em $APP_DIR${NC}"
    echo ""
    echo "1) 🛠️  Manutenção (Trocar credenciais / Domínio)"
    echo "2) 🔄 Atualizar Código (Git Pull + Build)"
    echo "3) ⚡ Atualizar Supabase (Functions + SQL)"
    echo "4) 🧹 Reinstalação Completa (Apaga tudo e instala do zero)"
    echo "5) ❌ Sair"
    echo ""
    read -p "Escolha uma opção: " OPTION

    if [ "$OPTION" == "4" ]; then
        echo -e "${RED}⚠️  ATENÇÃO: Isso apagará TODOS os dados locais e configurações em $APP_DIR e $WEB_DIR!${NC}"
        read -p "Tem certeza? (s/N): " CONFIRM
        if [[ "$CONFIRM" =~ ^[Ss]$ ]]; then
            echo -e "${YELLOW}Removendo instalação anterior...${NC}"
            rm -rf "$APP_DIR"
            rm -rf "$WEB_DIR"
            # O fluxo continuará para a instalação completa (OPTION 4 abaixo)
        else
            echo -e "${BLUE}Operação cancelada.${NC}"
            exit 0
        fi
    fi
else
    echo -e "${YELLOW}Nenhuma instalação detectada.${NC}"
    echo ""
    echo "1) 🚀 Instalação Completa"
    echo "2) ❌ Sair"
    echo ""
    read -p "Escolha uma opção: " OPTION
    [ "$OPTION" == "1" ] && OPTION="4" || exit 0
fi

case $OPTION in
    1)
        # Manutenção
        echo ""
        echo -e "${BLUE}━━━━━ MENU DE MANUTENÇÃO ━━━━━${NC}"
        echo "1) Trocar Credenciais Supabase"
        echo "2) Trocar Credenciais Asaas"
        echo "3) Trocar Subdomínio"
        echo "4) Voltar"
        echo ""
        read -p "Escolha: " MOPT
        
        case $MOPT in
            1)
                read -p "🔗 Nova VITE_SUPABASE_URL: " SUPA_URL
                read -p "🔑 Nova VITE_SUPABASE_PUBLISHABLE_KEY: " SUPA_KEY
                SUPA_PROJECT_ID=$(echo "$SUPA_URL" | sed -E 's|https?://([^.]+)\..*|\1|')
                save_env
                run_build
                ;;
            2)
                read -p "💳 Nova ASAAS_API_KEY: " ASAAS_API_KEY
                read -p "🌍 Nova ASAAS_BASE_URL: " ASAAS_BASE_URL
                read -p "🔐 Novo ASAAS_WEBHOOK_SECRET: " ASAAS_WEBHOOK_SECRET
                save_secrets
                echo -e "${YELLOW}Lembre-se de atualizar também no painel do Supabase!${NC}"
                ;;
            3)
                read -p "🌐 Novo Subdomínio: " DOMAIN
                read -p "📧 E-mail para SSL: " EMAIL
                if [ -f "$APP_DIR/.env" ]; then
                    SUPA_URL=$(grep VITE_SUPABASE_URL "$APP_DIR/.env" | cut -d= -f2)
                    SUPA_KEY=$(grep VITE_SUPABASE_PUBLISHABLE_KEY "$APP_DIR/.env" | cut -d= -f2)
                    SUPA_PROJECT_ID=$(grep VITE_SUPABASE_PROJECT_ID "$APP_DIR/.env" | cut -d= -f2)
                fi
                config_nginx
                apply_ssl
                ;;
            *) exit 0 ;;
        esac
        
        echo -e "${BLUE}Limpando cache do servidor...${NC}"
        # Força o recarregamento do Nginx e garante que o diretório web esteja limpo se necessário
        systemctl reload nginx
        # Se houve troca de domínio ou build, o run_build já cuida disso, 
        # mas garantimos aqui também.
        echo -e "${GREEN}✓ Manutenção concluída! Cache do servidor limpo e Nginx recarregado.${NC}"
        exit 0
        ;;
    2)
        # Atualizar Código
        echo ""
        echo -e "${BLUE}━━━━━ ATUALIZANDO CÓDIGO E SUPABASE ━━━━━${NC}"
        cd "$APP_DIR" && git pull
        run_build
        update_supabase_auto
        exit 0
        ;;
    3)
        # Atualizar Supabase (menu individual)
        update_supabase_auto
        exit 0
        ;;

    4)

        # Instalação Completa
        echo ""
        echo -e "${YELLOW}📋 Iniciando Instalação Completa...${NC}"
        echo ""
        read -p "🌐 Subdomínio (ex: app.seudominio.com.br): " DOMAIN
        read -p "📧 Seu e-mail (para SSL Let's Encrypt): " EMAIL
        read -p "🔗 VITE_SUPABASE_URL (ex: https://xxxx.supabase.co): " SUPA_URL
        read -p "🔑 VITE_SUPABASE_PUBLISHABLE_KEY (chave anon): " SUPA_KEY
        read -p "💳 ASAAS_API_KEY (opcional): " ASAAS_API_KEY
        read -p "🌍 ASAAS_BASE_URL [https://api.asaas.com/v3]: " ASAAS_BASE_URL
        ASAAS_BASE_URL=${ASAAS_BASE_URL:-https://api.asaas.com/v3}
        read -p "🔐 ASAAS_WEBHOOK_SECRET (opcional): " ASAAS_WEBHOOK_SECRET

        SUPA_PROJECT_ID=$(echo "$SUPA_URL" | sed -E 's|https?://([^.]+)\..*|\1|')

        if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ] || [ -z "$SUPA_URL" ] || [ -z "$SUPA_KEY" ]; then
            echo -e "${RED}❌ Campos obrigatórios faltando!${NC}"
            exit 1
        fi
        ;;
    *) exit 0 ;;
esac

# -----------------------------------------------------------------------------
# Fluxo da Instalação Completa (Etapa 2 em diante)
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}━━━━━ ETAPA 2/8: Atualizando sistema ━━━━━${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${BLUE}━━━━━ ETAPA 3/8: Instalando dependências ━━━━━${NC}"
apt install -y curl git nginx certbot python3-certbot-nginx ufw

if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo ""
echo -e "${BLUE}━━━━━ ETAPA 4/8: Clonando repositório ━━━━━${NC}"
if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Diretório já existe, atualizando...${NC}"
    cd "$APP_DIR" && git pull
else
    git clone "$REPO_URL" "$APP_DIR"
fi

echo ""
echo -e "${BLUE}━━━━━ ETAPA 5/8: Configurando variáveis ━━━━━${NC}"
save_env
save_secrets

echo ""
echo -e "${BLUE}━━━━━ ETAPA 6/8: Build da aplicação ━━━━━${NC}"
run_build

echo ""
echo -e "${BLUE}━━━━━ ETAPA 7/8: Configurando Nginx ━━━━━${NC}"
config_nginx

# Firewall
ufw allow 'Nginx Full' 2>/dev/null || true
ufw allow OpenSSH 2>/dev/null || true

echo ""
echo -e "${BLUE}━━━━━ ETAPA 8/8: Gerando certificado SSL ━━━━━${NC}"
apply_ssl

# -----------------------------------------------------------------------------
# Finalização
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=============================================================${NC}"
echo -e "${GREEN}   ✅ PROCESSO CONCLUÍDO COM SUCESSO!                        ${NC}"
echo -e "${GREEN}=============================================================${NC}"
echo ""
echo -e "${GREEN}🌐 URL: https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}⚠️  PRÓXIMOS PASSOS (manuais, no painel Supabase):${NC}"
echo "  1. Rode o SQL: new_deploy/database_schema.sql"
echo "  2. Cadastre os Secrets (se não informou aqui) em Edge Functions > Secrets"
echo "  3. Publique as Edge Functions copiando o código de new_deploy/functions/"
echo ""
echo -e "${BLUE}📝 Dica: Execute este script novamente para fazer manutenção ou atualizar o site.${NC}"
echo ""
