# Bivvo Checkout - Exportação Rápida

## 📦 Estrutura de Exportação

```
deploy/
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql      # Schema completo
│       └── 002_security_policies.sql   # Políticas RLS
├── docker/
│   ├── Dockerfile                      # Build multi-stage
│   ├── nginx.conf                      # Configuração Nginx
│   ├── docker-compose.yml              # Dev local
│   ├── docker-compose.traefik.yml      # Produção + Traefik
│   └── .env.example                    # Template de variáveis
├── supabase-cli/
│   ├── deploy-functions.sh             # Deploy Edge Functions
│   └── setup-secrets.sh                # Configurar secrets
└── EXPORT_DOCUMENTATION.md             # Documentação completa
```

## 🚀 Quick Start

### 1. Supabase Externo
```bash
# Execute as migrations no SQL Editor do Supabase
# Copie os arquivos de deploy/database/migrations/
```

### 2. Deploy Edge Functions
```bash
cd deploy/supabase-cli
chmod +x *.sh
./deploy-functions.sh
./setup-secrets.sh
```

### 3. Docker + Traefik
```bash
cd deploy/docker
cp .env.example .env
# Edite .env com seus valores
docker-compose -f docker-compose.traefik.yml up -d
```

## 📖 Documentação Completa

Veja [deploy/EXPORT_DOCUMENTATION.md](deploy/EXPORT_DOCUMENTATION.md) para instruções detalhadas.
