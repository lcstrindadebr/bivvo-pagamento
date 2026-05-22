#!/bin/bash
# Script de preparação automática para VPS (Ubuntu/Debian)
# Este script instala Node.js, Nginx e Certbot.

echo "--- Iniciando configuração da VPS para o projeto Bivvo ---"

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Nginx
sudo apt install -y nginx

# Instalar Certbot para SSL
sudo apt install -y certbot python3-certbot-nginx

# Verificar instalações
echo "--- Verificação ---"
node -v
npm -v
nginx -v
certbot --version

echo "--- Pronto! Agora siga o manual INSTALL.md para configurar o domínio. ---"
