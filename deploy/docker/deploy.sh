#!/bin/bash

# =============================================================================
# BIVVO CHECKOUT - SCRIPT DE DEPLOY AUTOMATIZADO
# =============================================================================

set -e

echo "🚀 Iniciando deploy do Bivvo Checkout..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erro: Execute este script do diretório deploy/docker${NC}"
    exit 1
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Copiando .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Por favor, edite o arquivo .env com suas credenciais e execute novamente${NC}"
    exit 1
fi

# Carregar variáveis do .env
source .env

echo -e "${GREEN}✅ Variáveis de ambiente carregadas${NC}"

# Verificar se o domínio está configurado
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Erro: DOMAIN não está definido no .env${NC}"
    exit 1
fi

echo -e "${GREEN}📦 Domain configurado: $DOMAIN${NC}"

# Parar containers existentes
echo -e "${YELLOW}🛑 Parando containers existentes...${NC}"
docker compose down 2>/dev/null || true

# Build das imagens
echo -e "${YELLOW}🔨 Fazendo build das imagens...${NC}"
docker compose build --no-cache

# Iniciar aplicação sem nginx (para obter certificado)
echo -e "${YELLOW}🎬 Iniciando aplicação...${NC}"
docker compose up -d bivvo-frontend

# Aguardar aplicação ficar saudável
echo -e "${YELLOW}⏳ Aguardando aplicação ficar saudável...${NC}"
sleep 10

# Verificar se precisa obter certificado SSL
if [ ! -d "/var/lib/docker/volumes/docker_certbot_conf/_data/live/$DOMAIN" ]; then
    echo -e "${YELLOW}🔐 Obtendo certificado SSL...${NC}"
    
    # Iniciar nginx temporário
    docker run -d --name nginx-temp \
        --network docker_bivvo-network \
        -p 80:80 \
        -v docker_certbot_www:/var/www/certbot:rw \
        -v "$(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf:ro" \
        nginx:alpine

    # Criar configuração temporária
    cat > nginx-temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'Aguardando certificado SSL...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

    # Recarregar nginx temporário
    docker restart nginx-temp
    sleep 5

    # Obter certificado
    docker run --rm \
        --network docker_bivvo-network \
        -v docker_certbot_www:/var/www/certbot:rw \
        -v docker_certbot_conf:/etc/letsencrypt:rw \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${CERTBOT_EMAIL:-admin@$DOMAIN} \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d $DOMAIN

    # Parar nginx temporário
    docker stop nginx-temp
    docker rm nginx-temp
    rm -f nginx-temp.conf

    echo -e "${GREEN}✅ Certificado SSL obtido com sucesso!${NC}"
else
    echo -e "${GREEN}✅ Certificado SSL já existe${NC}"
fi

# Iniciar todos os serviços
echo -e "${YELLOW}🎬 Iniciando todos os serviços...${NC}"
docker compose up -d

# Aguardar serviços ficarem saudáveis
echo -e "${YELLOW}⏳ Aguardando serviços ficarem saudáveis...${NC}"
sleep 15

# Verificar status
echo -e "${GREEN}📊 Status dos serviços:${NC}"
docker compose ps

# Testar conectividade
echo -e "${YELLOW}🧪 Testando conectividade...${NC}"
if curl -k -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Aplicação está respondendo em https://$DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠️  Aguarde alguns segundos e tente acessar https://$DOMAIN${NC}"
fi

echo -e "${GREEN}🎉 Deploy concluído!${NC}"
echo -e "${GREEN}🌐 Acesse: https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}📝 Comandos úteis:${NC}"
echo "  - Ver logs: docker compose logs -f"
echo "  - Status: docker compose ps"
echo "  - Parar: docker compose down"
echo "  - Reiniciar: docker compose restart"
