FROM node:22-bookworm

# Instalar herramientas esenciales para desarrollo y versionado
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Crear estructura base para plugins de Antigravity
RUN mkdir -p /root/.gemini/config/plugins
