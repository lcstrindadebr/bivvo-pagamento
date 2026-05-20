#!/bin/bash
# =============================================================================
# BIVVO - AUTO INSTALADOR COMPLETO (VPS Ubuntu/Debian)
# =============================================================================
# Este script faz TUDO automaticamente:
#  1. Atualiza o sistema
#  2. Instala Node.js, Nginx, Certbot, Git
#  3. Clona o repositório do GitHub
#  4. Pede as credenciais (Supabase + Domínio + E-mail)
#  5. Cria o arquivo .env
#  6. Faz o build da aplicação
#  7. Configura o Nginx no subdomínio
#  8. Gera o SSL gratuito (Let's Encrypt)
#  9. Coloca o site no ar
#
# COMO USAR (em uma VPS limpa, como root ou com sudo):
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

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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
    nginx -t && systemctl restart nginx
    echo -e "${GREEN}✓ Nginx configurado para $DOMAIN${NC}"
}

apply_ssl() {
    echo -e "${BLUE}━━━━━ Gerando certificado SSL ━━━━━${NC}"
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect || echo -e "${RED}⚠️ Erro ao gerar SSL. Verifique se o domínio aponta para este IP.${NC}"
}

run_build() {
    echo -e "${BLUE}━━━━━ Gerando Build ━━━━━${NC}"
    cd "$APP_DIR"
    npm install
    npm run build
    mkdir -p "$WEB_DIR"
    rm -rf "$WEB_DIR"/*
    cp -r "$APP_DIR/dist/"* "$WEB_DIR/"
    chown -R www-data:www-data "$WEB_DIR"
    echo -e "${GREEN}✓ Build concluído e publicado${NC}"
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
    echo "3) 🧹 Reinstalação Completa"
    echo "4) ❌ Sair"
    read -p "Escolha uma opção: " OPTION
else
    echo -e "${YELLOW}Nenhuma instalação detectada.${NC}"
    echo ""
    echo "1) 🚀 Instalação Completa"
    echo "2) ❌ Sair"
    read -p "Escolha uma opção: " OPTION
    [ "$OPTION" == "1" ] && OPTION="3" || exit 0
fi

case $OPTION in
    1)
        # Manutenção
        echo -e "${BLUE}━━━━━ MENU DE MANUTENÇÃO ━━━━━${NC}"
        echo "1) Trocar Credenciais Supabase"
        echo "2) Trocar Credenciais Asaas"
        echo "3) Trocar Subdomínio"
        echo "4) Voltar"
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
                # Carregar Supabase URL do .env atual se existir
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
        echo -e "${GREEN}✓ Manutenção concluída!${NC}"
        exit 0
        ;;
    2)
        # Atualizar
        echo -e "${BLUE}━━━━━ ATUALIZANDO CÓDIGO ━━━━━${NC}"
        cd "$APP_DIR" && git pull
        run_build
        exit 0
        ;;
    3)
        # Instalação Completa (Código original adaptado)
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
# 2. Atualizar sistema
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}━━━━━ ETAPA 2/8: Atualizando sistema ━━━━━${NC}"
apt update && apt upgrade -y

# -----------------------------------------------------------------------------
# 3. Instalar dependências
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}━━━━━ ETAPA 3/8: Instalando dependências ━━━━━${NC}"
apt install -y curl git nginx certbot python3-certbot-nginx ufw

# Node.js 20
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo -e "${GREEN}✓ Node $(node -v) | npm $(npm -v) | Nginx instalado${NC}"

# -----------------------------------------------------------------------------
# 4. Clonar repositório
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}━━━━━ ETAPA 4/8: Clonando repositório ━━━━━${NC}"
if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Diretório já existe, atualizando...${NC}"
    cd "$APP_DIR" && git pull
else
    git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# -----------------------------------------------------------------------------
# 5. Criar .env
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}━━━━━ ETAPA 5/8: Configurando variáveis (.env) ━━━━━${NC}"
cat > "$APP_DIR/.env" <<EOF
VITE_SUPABASE_URL=$SUPA_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPA_KEY
VITE_SUPABASE_PROJECT_ID=$SUPA_PROJECT_ID
EOF
chmod 600 "$APP_DIR/.env"
echo -e "${GREEN}✓ .env do frontend criado em $APP_DIR/.env${NC}"

# Salvar secrets do Asaas em arquivo separado (se informados)
if [ -n "$ASAAS_API_KEY" ] || [ -n "$ASAAS_WEBHOOK_SECRET" ]; then
    cat > "$APP_DIR/supabase-secrets.env" <<EOF
# Secrets para cadastrar no Supabase em: Edge Functions → Secrets
ASAAS_API_KEY=$ASAAS_API_KEY
ASAAS_BASE_URL=$ASAAS_BASE_URL
ASAAS_WEBHOOK_SECRET=$ASAAS_WEBHOOK_SECRET
EOF
    chmod 600 "$APP_DIR/supabase-secrets.env"
    echo -e "${GREEN}✓ Secrets do Asaas salvos em $APP_DIR/supabase-secrets.env${NC}"
    echo -e "${YELLOW}  → Cadastre estes valores no painel do Supabase (Edge Functions → Secrets)${NC}"
fi

# -----------------------------------------------------------------------------
# 6. Build da aplicação
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}━━━━━ ETAPA 6/8: Build da aplicação ━━━━━${NC}"
npm install
npm run build

mkdir -p "$WEB_DIR"
rm -rf "$WEB_DIR"/*
cp -r "$APP_DIR/dist/"* "$WEB_DIR/"
chown -R www-data:www-data "$WEB_DIR"
echo -e "${GREEN}✓ Aplicação publicada em $WEB_DIR${NC}"

# -----------------------------------------------------------------------------
# 7. Configurar Nginx
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}━━━━━ ETAPA 7/8: Configurando Nginx ━━━━━${NC}"
cat > "/etc/nginx/sites-available/bivvo" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $WEB_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

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
nginx -t
systemctl restart nginx
echo -e "${GREEN}✓ Nginx configurado para $DOMAIN${NC}"

# Firewall
ufw allow 'Nginx Full' 2>/dev/null || true
ufw allow OpenSSH 2>/dev/null || true

# -----------------------------------------------------------------------------
# 8. SSL com Let's Encrypt
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}━━━━━ ETAPA 8/8: Gerando certificado SSL ━━━━━${NC}"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

# -----------------------------------------------------------------------------
# Final
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=============================================================${NC}"
echo -e "${GREEN}   ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!                      ${NC}"
echo -e "${GREEN}=============================================================${NC}"
echo ""
echo -e "${GREEN}🌐 Acesse: https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}⚠️  PRÓXIMOS PASSOS (manuais, no painel Supabase):${NC}"
echo "  1. Rode o SQL: new_deploy/database_schema.sql"
echo "     (Supabase Dashboard > SQL Editor > New Query)"
echo ""
echo "  2. Cadastre os Secrets em Edge Functions > Secrets:"
echo "     - ASAAS_API_KEY     = sua chave do Asaas"
echo "     - ASAAS_BASE_URL    = https://api.asaas.com/v3"
echo "     - ASAAS_WEBHOOK_SECRET = (token que você inventar)"
echo ""
echo "  3. Publique as Edge Functions (Edge Functions > New Function):"
echo "     copie o código de cada pasta em new_deploy/functions/"
echo ""
echo "  4. Configure o webhook no Asaas:"
echo "     URL: $SUPA_URL/functions/v1/asaas-webhook"
echo ""
echo -e "${BLUE}📝 Para atualizar o site no futuro:${NC}"
echo "  cd $APP_DIR && git pull && npm install && npm run build && cp -r dist/* $WEB_DIR/"
echo ""
