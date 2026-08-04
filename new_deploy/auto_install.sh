#!/bin/bash
# =============================================================================
# BIVVO - AUTO INSTALADOR E GERENCIADOR (VPS Ubuntu/Debian)
# =============================================================================
# Este script faz a instalação e a manutenção do sistema Bivvo.
#
# COMO USAR:
#   curl -fsSL https://raw.githubusercontent.com/lcstrindadebr/project-lovebug-launch/main/new_deploy/auto_install.sh -o install.sh
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

REPO_URL="https://github.com/lcstrindadebr/project-lovebug-launch.git"
# Configurações para garantir que o Git não peça senha em repositório público
export GIT_TERMINAL_PROMPT=0
export GCM_INTERACTIVE=never
export GIT_ASKPASS=/bin/true
# Usamos a configuração global temporária para o processo atual para garantir bypass total
export GIT_CONFIG_PARAMETERS="'credential.helper='"
git config --global credential.helper ""


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
    local EXISTING_DB_URL=""
    if [ -f "$APP_DIR/.env" ]; then
        EXISTING_DB_URL=$(read_env_value "SUPABASE_DB_URL" "$APP_DIR/.env")
    fi

    cat > "$APP_DIR/.env" <<EOF
VITE_SUPABASE_URL=$SUPA_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPA_KEY
VITE_SUPABASE_PROJECT_ID=$SUPA_PROJECT_ID
EOF

    if [ -n "$EXISTING_DB_URL" ]; then
        upsert_env_value "SUPABASE_DB_URL" "$EXISTING_DB_URL" "$APP_DIR/.env"
    fi

    chmod 600 "$APP_DIR/.env"
    echo -e "${GREEN}✓ .env atualizado em $APP_DIR/.env${NC}"
}

trim_value() {
    local value="$1"
    value="${value//$'\r'/}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "$value"
}

normalize_db_url() {
    local value="$1"
    value=$(trim_value "$value")
    value="${value#export }"
    value=$(trim_value "$value")
    value="${value#SUPABASE_DB_URL= }"
    value="${value#SUPABASE_DB_URL=}" 
    value="${value#DATABASE_URL= }"
    value="${value#DATABASE_URL=}"
    value=$(trim_value "$value")

    if [[ "$value" == \"*\" ]]; then
        value="${value#\"}"
        value="${value%\"}"
    fi
    if [[ "$value" == \'*\' ]]; then
        value="${value#\'}"
        value="${value%\'}"
    fi

    value=$(trim_value "$value")
    printf '%s' "$value"
}

read_env_value() {
    local key="$1"
    local file="$2"
    local line=""

    [ -f "$file" ] || return 0
    line=$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" | tail -n1 || true)
    line="${line#export }"
    line="${line#${key}=}"
    normalize_db_url "$line"
}

upsert_env_value() {
    local key="$1"
    local value="$2"
    local file="$3"
    local tmp="${file}.tmp"
    local safe_value="${value//\"/\\\"}"

    mkdir -p "$(dirname "$file")"
    touch "$file"
    grep -vE "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" > "$tmp" || true
    printf '%s="%s"\n' "$key" "$safe_value" >> "$tmp"
    mv "$tmp" "$file"
    chmod 600 "$file"
}

db_url_host() {
    local value="$1"
    printf '%s' "$value" | sed -E 's#^postgres(ql)?://([^@/]+@)?([^:/?]+).*#\3#'
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

    local DEFAULT_SUPA_REF="bcijktxnuzsatvhammpl"
    local SUPA_REF="${SUPABASE_PROJECT_REF:-$DEFAULT_SUPA_REF}"
    local SUPA_TOKEN=""
    local DB_URL=""

    if [ ! -d "$APP_DIR" ]; then
        echo -e "${RED}❌ $APP_DIR não encontrado. Rode a instalação primeiro.${NC}"
        return 1
    fi

    cd "$APP_DIR" || return 1
    echo -e "${GREEN}✓ Diretório atual: $(pwd)${NC}"

    echo ""
    echo -e "${YELLOW}Novo método: deploy direto pelo Project Ref, sem 'login' e sem 'link'.${NC}"
    echo -e "${YELLOW}Isso evita conflito com sessão/cache antigo do Supabase CLI.${NC}"
    echo ""

    # Sempre pede o token na atualização (mesmo que exista no ambiente)
    echo -e "${YELLOW}Gere/obtenha o token em: https://supabase.com/dashboard/account/tokens${NC}"
    while [ -z "$SUPA_TOKEN" ]; do
        read -r -s -p "🔑 Cole o Supabase Access Token (sbp_...): " SUPA_TOKEN
        echo ""
        if [ -z "$SUPA_TOKEN" ]; then
            echo -e "${RED}❌ Access Token é obrigatório para publicar as Edge Functions.${NC}"
        fi
    done

    read -r -p "🆔 Project Ref [$SUPA_REF]: " INPUT_SUPA_REF
    SUPA_REF="${INPUT_SUPA_REF:-$SUPA_REF}"

    if [ -z "$SUPA_REF" ]; then
        echo -e "${RED}❌ Project Ref é obrigatório.${NC}"
        return 1
    fi

    export SUPABASE_ACCESS_TOKEN="$SUPA_TOKEN"

    echo ""
    echo -e "${BLUE}→ Publicando Edge Functions com deploy direto...${NC}"

    local TMP_SUPA_HOME
    TMP_SUPA_HOME=$(mktemp -d)

    if HOME="$TMP_SUPA_HOME" npx -y supabase@latest functions deploy --project-ref "$SUPA_REF" --no-verify-jwt; then
        rm -rf "$TMP_SUPA_HOME"
        echo -e "${GREEN}✓ Edge Functions publicadas.${NC}"
    else
        rm -rf "$TMP_SUPA_HOME"
        echo -e "${RED}❌ Falha ao publicar as Edge Functions pelo método direto.${NC}"
        echo -e "${YELLOW}Verifique se o token pertence à conta dona do projeto e se o Project Ref está correto.${NC}"
        return 1
    fi

    # Aplicação do schema + migrations no banco (via psql direto no banco)
    echo -e "${BLUE}→ Aplicando SQL (schema + migrations)...${NC}"

    if ! command -v psql >/dev/null 2>&1; then
        echo -e "${YELLOW}psql não encontrado. Instalando postgresql-client...${NC}"
        apt update && apt install -y postgresql-client
    fi

    # Sempre remove a URL antiga antes de pedir uma nova senha. Isso evita reutilizar
    # uma connection string quebrada salva anteriormente, como postgres@senha@host.
    if [ -f "$APP_DIR/.env" ]; then
        sed -i.bak -E '/^[[:space:]]*(export[[:space:]]+)?SUPABASE_DB_URL=/d' "$APP_DIR/.env" 2>/dev/null || true
        rm -f "$APP_DIR/.env.bak"
    fi

    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Precisamos aplicar o SQL via psql. Isso exige a SENHA do banco.${NC}"
    echo -e "${YELLOW}API key/JWT/anon key NÃO funcionam aqui.${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Se seu VPS não tem IPv6 (erro 'Network is unreachable'),${NC}"
    echo -e "${YELLOW}    use o SESSION POOLER (IPv4) do Supabase:${NC}"
    echo -e "${YELLOW}    Dashboard → Project Settings → Database → Connection string → Session pooler${NC}"
    echo ""
    echo -e "${YELLOW}Você pode:${NC}"
    echo -e "${YELLOW}  [1] Colar a CONNECTION STRING completa (recomendado p/ pooler)${NC}"
    echo -e "${YELLOW}      Ex.: postgresql://postgres.<ref>:<senha>@aws-0-us-east-1.pooler.supabase.com:5432/postgres${NC}"
    echo -e "${YELLOW}  [2] Digitar apenas o project ref e o script pede a senha (usa db.<ref>.supabase.co, IPv6)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    local ATTEMPTS=0
    DB_URL=""
    while [ "$ATTEMPTS" -lt 3 ]; do
        ATTEMPTS=$((ATTEMPTS+1))

        read -r -p "🔗 Cole a connection string OU o project ref (tentativa ${ATTEMPTS}/3): " DB_INPUT
        DB_INPUT=$(trim_value "$DB_INPUT")

        if [ -z "$DB_INPUT" ]; then
            echo -e "${RED}❌ Entrada vazia.${NC}"
            continue
        fi

        if [[ "$DB_INPUT" =~ ^postgres(ql)?:// ]]; then
            # Connection string completa — usa como veio.
            DB_URL="$DB_INPUT"
            if [[ "$DB_URL" != *"sslmode="* ]]; then
                if [[ "$DB_URL" == *"?"* ]]; then
                    DB_URL="${DB_URL}&sslmode=require"
                else
                    DB_URL="${DB_URL}?sslmode=require"
                fi
            fi
        else
            # Só ref/host — pede senha separada e monta URL direta (IPv6).
            local DB_HOST="$DB_INPUT"
            DB_HOST="${DB_HOST%%:*}"
            DB_HOST="${DB_HOST%%/*}"
            [[ "$DB_HOST" != *.* ]] && DB_HOST="db.${DB_HOST}.supabase.co"

            local DB_PASS=""
            while [ -z "$DB_PASS" ]; do
                read -r -s -p "🔐 Senha do banco Postgres: " DB_PASS
                echo ""
                [ -z "$DB_PASS" ] && echo -e "${RED}❌ Senha vazia.${NC}"
            done

            local DB_PASS_ENC
            DB_PASS_ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1], safe=''))" "$DB_PASS" 2>/dev/null || printf '%s' "$DB_PASS")
            DB_URL="postgresql://postgres:${DB_PASS_ENC}@${DB_HOST}:5432/postgres?sslmode=require"
        fi

        local TEST_HOST
        TEST_HOST=$(db_url_host "$DB_URL")
        echo -e "${BLUE}→ Testando conexão com: ${TEST_HOST}${NC}"

        local PSQL_ERR
        PSQL_ERR=$(mktemp)
        if PGCONNECT_TIMEOUT=20 psql --dbname="$DB_URL" -v ON_ERROR_STOP=1 -c "select 1;" >/dev/null 2>"$PSQL_ERR"; then
            rm -f "$PSQL_ERR"
            upsert_env_value "SUPABASE_DB_URL" "$DB_URL" "$APP_DIR/.env"
            echo -e "${GREEN}✓ SUPABASE_DB_URL validada e salva em $APP_DIR/.env.${NC}"
            break
        fi

        cat "$PSQL_ERR"

        if grep -qiE "Network is unreachable|No route to host|could not translate host name|connection timed out" "$PSQL_ERR"; then
            rm -f "$PSQL_ERR"
            echo ""
            echo -e "${RED}❌ Host inacessível a partir deste VPS — NÃO é senha errada.${NC}"
            echo -e "${YELLOW}Provável causa: host ${TEST_HOST} responde apenas em IPv6 e este VPS não tem IPv6.${NC}"
            echo -e "${YELLOW}Solução: no Supabase Dashboard → Database → Connection string, copie a URL do${NC}"
            echo -e "${YELLOW}         'Session pooler' (host aws-0-*.pooler.supabase.com, IPv4) e cole aqui.${NC}"
            echo ""
            DB_URL=""
            continue
        fi

        if grep -qiE "password authentication failed|authentication failed" "$PSQL_ERR"; then
            rm -f "$PSQL_ERR"
            DB_URL=""
            echo -e "${RED}❌ Senha incorreta. Tente novamente.${NC}"
            continue
        fi

        rm -f "$PSQL_ERR"
        DB_URL=""
        echo -e "${RED}❌ Falha ao conectar. Verifique a string e tente novamente.${NC}"
    done

    if [ -z "$DB_URL" ]; then
        echo -e "${RED}❌ Não foi possível conectar ao banco após 3 tentativas.${NC}"
        echo -e "${YELLOW}Use o Session Pooler (IPv4) do Supabase Dashboard e execute novamente.${NC}"
        return 1
    fi



    if [ -f "new_deploy/database_schema.sql" ]; then
        echo -e "${BLUE}  → database_schema.sql${NC}"
        PGCONNECT_TIMEOUT=20 psql --dbname="$DB_URL" -v ON_ERROR_STOP=0 -f new_deploy/database_schema.sql
    else
        echo -e "${YELLOW}⚠️  new_deploy/database_schema.sql não encontrado.${NC}"
    fi

    if [ -d "new_deploy/migrations" ]; then
        while IFS= read -r -d '' MIG; do
            echo -e "${BLUE}  → $(basename "$MIG")${NC}"
            PGCONNECT_TIMEOUT=20 psql --dbname="$DB_URL" -v ON_ERROR_STOP=0 -f "$MIG"
        done < <(find new_deploy/migrations -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)
    else
        echo -e "${YELLOW}⚠️  Pasta new_deploy/migrations não encontrada.${NC}"
    fi

    echo -e "${GREEN}✓ Schema e migrations aplicados.${NC}"

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
        cd "$APP_DIR"
        
        # Garante que a origem está correta para evitar o erro do repositório antigo
        git remote set-url origin "$REPO_URL"
        
        # Em VPS de produção, o ideal é fazer o reset para o estado do repositório remoto
        # para evitar erros de "divergent branches" ou conflitos locais acidentais.
        echo -e "${YELLOW}Limpando alterações locais e sincronizando com o repositório remoto...${NC}"
        git -c credential.helper= fetch origin main
        git -c credential.helper= reset --hard origin/main
        
        run_build
        update_supabase_auto
        exit 0
        ;;


    3)
        # Atualizar Supabase (menu individual)
        # Sincroniza o código antes para garantir que os arquivos SQL e Functions estejam na versão mais nova
        cd "$APP_DIR"
        git -c credential.helper= fetch origin main
        git -c credential.helper= reset --hard origin/main
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
if [ -d "$APP_DIR/.git" ]; then
    echo -e "${YELLOW}Diretório já existe, sincronizando com repositório remoto...${NC}"
    cd "$APP_DIR"
    git remote set-url origin "$REPO_URL"
    git -c credential.helper= fetch origin main
    git -c credential.helper= reset --hard origin/main
else
    # Se o diretório existe mas não é um repo git (ex: falha anterior), removemos para clonar limpo

    [ -d "$APP_DIR" ] && rm -rf "$APP_DIR"
    git -c credential.helper= clone "$REPO_URL" "$APP_DIR"
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
