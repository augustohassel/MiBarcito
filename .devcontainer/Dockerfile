FROM node:22-bookworm

# Instalar herramientas esenciales para desarrollo, versionado, Google Cloud CLI y Terraform
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    unzip \
    gnupg \
    apt-transport-https \
    ca-certificates \
    python3 \
    && curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list \
    && apt-get update && apt-get install -y --no-install-recommends google-cloud-cli \
    && rm -rf /var/lib/apt/lists/*

# Instalar HashiCorp Terraform CLI (v1.17.1)
ARG TERRAFORM_VERSION=1.17.1
RUN ARCH=$(dpkg --print-architecture) \
    && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${ARCH}.zip" -o /tmp/terraform.zip \
    && unzip -o /tmp/terraform.zip -d /usr/local/bin \
    && rm -f /tmp/terraform.zip /usr/local/bin/LICENSE.txt \
    && terraform --version \
    && gcloud --version

# Crear estructura base para plugins de Antigravity
RUN mkdir -p /root/.gemini/config/plugins
