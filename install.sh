#!/bin/bash
# =============================================================================
# Script de Instalação — CRM Celular
# Gera automaticamente um JWT_SECRET seguro e configura o ambiente.
# =============================================================================

set -e

echo "============================================="
echo "  Instalação do CRM Celular"
echo "============================================="

# Verifica se o openssl está disponível
if ! command -v openssl &> /dev/null; then
    echo "ERRO: openssl não encontrado. Instale-o antes de continuar."
    echo "  Ubuntu/Debian: sudo apt-get install openssl"
    echo "  CentOS/RHEL:   sudo yum install openssl"
    exit 1
fi

ENV_FILE=".env"

# Não sobrescreve um .env já existente
if [ -f "$ENV_FILE" ]; then
    echo "[AVISO] Arquivo .env já existe. Pulando geração do secret."
    echo "        Se quiser regenerar, delete o arquivo .env e execute novamente."
else
    echo "[1/3] Gerando JWT_SECRET seguro com openssl..."
    JWT_SECRET=$(openssl rand -hex 32)

    echo "[2/3] Criando arquivo .env..."
    cat > "$ENV_FILE" <<EOF
# ============================================================
# Variáveis de Ambiente — geradas automaticamente em $(date)
# ============================================================

# Chave secreta para assinar tokens JWT (gerada automaticamente).
# NÃO compartilhe este valor e NÃO edite sem gerar um novo.
JWT_SECRET=${JWT_SECRET}

# Porta do servidor backend.
PORT=4000

# Banco de dados SQLite.
DATABASE_URL=file:./data/database.db

# Diretório de uploads.
UPLOAD_DIR=./uploads
EOF

    echo "[3/3] Arquivo .env criado com sucesso."
    echo ""
    echo "  JWT_SECRET gerado: (oculto por segurança)"
    echo ""
fi

echo "============================================="
echo "  Próximos passos:"
echo "    1. Revise o arquivo .env gerado."
echo "    2. Execute: docker-compose up -d"
echo "============================================="
