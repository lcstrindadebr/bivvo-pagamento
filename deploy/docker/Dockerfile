# =============================================================================
# BIVVO CHECKOUT - DOCKERFILE PARA PRODUÇÃO
# =============================================================================
# Build multi-stage otimizado para produção com Nginx
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY bun.lockb ./

# Instalar dependências
RUN npm ci --legacy-peer-deps

# Copiar código fonte
COPY . .

# Variáveis de ambiente para build (serão sobrescritas em runtime)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Build da aplicação
RUN npm run build

# Stage 2: Produção com Nginx
FROM nginx:alpine AS production

# Copiar configuração customizada do Nginx
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Criar script para injetar variáveis de ambiente em runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-inject-env.sh && \
    echo 'for file in /usr/share/nginx/html/assets/*.js; do' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  if [ -f "$file" ]; then' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '    sed -i "s|VITE_SUPABASE_URL_PLACEHOLDER|${VITE_SUPABASE_URL}|g" "$file"' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '    sed -i "s|VITE_SUPABASE_PUBLISHABLE_KEY_PLACEHOLDER|${VITE_SUPABASE_PUBLISHABLE_KEY}|g" "$file"' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '    sed -i "s|VITE_SUPABASE_PROJECT_ID_PLACEHOLDER|${VITE_SUPABASE_PROJECT_ID}|g" "$file"' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo '  fi' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo 'done' >> /docker-entrypoint.d/40-inject-env.sh && \
    chmod +x /docker-entrypoint.d/40-inject-env.sh

# Expor porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Comando padrão
CMD ["nginx", "-g", "daemon off;"]
