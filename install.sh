#!/bin/bash

# Cores para formatação
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}    Instalador Automatizado - CRM Gestão Celular      ${NC}"
echo -e "${BLUE}======================================================${NC}\n"

# Verifica ambiente
echo -e "${YELLOW}Verificando dependências básicas...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js não encontrado. Por favor, instale o Node.js v18 ou superior.${NC}"
  # Não dou exit imediato pois o usuário pode rodar apenas via Docker puro
fi
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Aviso: Docker não encontrado. Só poderá rodar no modo Node local.${NC}"
fi

echo -e "\n${GREEN}Como você deseja rodar o projeto?${NC}"
echo "1) Localmente (Node.js nativo + PM2/Terminal)"
echo "2) Containerizado (Docker + Docker Compose)"
read -p "Escolha [1 ou 2]: " RUN_MODE

echo -e "\n${GREEN}Qual banco de dados deseja usar?${NC}"
echo "1) SQLite (Padrão, arquivo local, não requer servidor extra)"
echo "2) PostgreSQL (Recomendado para produção, requer conexão ou Docker)"
read -p "Escolha [1 ou 2]: " DB_MODE

echo -e "\n${YELLOW}--- Configuração de Variáveis ---${NC}"

# Chave JWT
read -p "Digite uma chave secreta para as autenticações (JWT_SECRET) [ou pressione Enter para gerar automática]: " JWT_USER
if [ -z "$JWT_USER" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  echo -e "Chave gerada automaticamente: ${GREEN}$JWT_SECRET${NC}"
else
  JWT_SECRET=$JWT_USER
fi

# URL do Banco
if [ "$DB_MODE" == "2" ]; then
    if [ "$RUN_MODE" == "1" ]; then
        echo -e "${YELLOW}Você escolheu rodar em Node, mas usando o PostgreSQL.${NC}"
        read -p "Digite a URL de conexão do PostgreSQL (ex: postgresql://user:pass@localhost:5432/crm?schema=public): " PG_URL
        DB_URL=$PG_URL
    else
        echo -e "${GREEN}O Docker irá provisionar um PostgreSQL automaticamente.${NC}"
        DB_URL="postgresql://crm:crm_password@postgres:5432/church_crm?schema=public"
    fi
else
    DB_URL="file:./dev.db"
fi

# Criação do .env
echo -e "\n${YELLOW}Criando arquivo(s) .env...${NC}"
cat <<EOT > server/.env
NODE_ENV=production
PORT=3000
JWT_SECRET=${JWT_SECRET}
DATABASE_URL="${DB_URL}"
EOT

# Se for Docker, cria um .env na raiz pra o compose ler as vars se precisar
if [ "$RUN_MODE" == "2" ]; then
cat <<EOT > .env
NODE_ENV=production
PORT=3000
JWT_SECRET=${JWT_SECRET}
DATABASE_URL="${DB_URL}"
EOT
fi
echo -e "${GREEN}.env configurados com sucesso!${NC}"

# Ajuste do Prisma Schema
echo -e "\n${YELLOW}Configurando o Prisma ORM...${NC}"
SCHEMA_FILE="server/prisma/schema.prisma"
if [ "$DB_MODE" == "2" ]; then
  # Troca sqlite por postgresql
  sed -i 's/provider = "sqlite"/provider = "postgresql"/g' $SCHEMA_FILE
  echo -e "${GREEN}Prisma alterado para PostgreSQL.${NC}"
  
  if [ "$RUN_MODE" == "2" ]; then
    # Descomentar postgres no docker-compose.yml
    echo -e "${YELLOW}Ajustando docker-compose.yml para subir banco PostgreSQL...${NC}"
    sed -i 's/# postgres:/postgres:/g' docker-compose.yml
    sed -i 's/#   image: postgres:15/  image: postgres:15/g' docker-compose.yml
    sed -i 's/#   restart: always/  restart: always/g' docker-compose.yml
    sed -i 's/#   environment:/  environment:/g' docker-compose.yml
    sed -i 's/#     POSTGRES_USER/    POSTGRES_USER/g' docker-compose.yml
    sed -i 's/#     POSTGRES_PASSWORD/    POSTGRES_PASSWORD/g' docker-compose.yml
    sed -i 's/#     POSTGRES_DB/    POSTGRES_DB/g' docker-compose.yml
    sed -i 's/#   ports:/  ports:/g' docker-compose.yml
    sed -i 's/#     - "5432:5432"/    - "5432:5432"/g' docker-compose.yml
    sed -i 's/#   volumes:/  volumes:/g' docker-compose.yml
    sed -i 's/#     - crm_pg_data:\/var\/lib\/postgresql\/data/    - crm_pg_data:\/var\/lib\/postgresql\/data/g' docker-compose.yml
    sed -i 's/    # crm_pg_data:.*/  crm_pg_data:/g' docker-compose.yml
  fi
else
  # Garante sqlite
  sed -i 's/provider = "postgresql"/provider = "sqlite"/g' $SCHEMA_FILE
  echo -e "${GREEN}Prisma alterado para SQLite.${NC}"
fi

# Instalação
if [ "$RUN_MODE" == "1" ]; then
  echo -e "\n${BLUE}======================================================${NC}"
  echo -e "${BLUE} Iniciando Instalação de Dependências Node (Local)    ${NC}"
  echo -e "${BLUE}======================================================${NC}"
  
  echo "Instalando frontend (CWD: \$(pwd))..."
  npm install --no-audit --no-fund
  
  echo "Rodando o build da interface web..."
  npm run build
  
  echo "Instalando backend..."
  cd server
  npm install --no-audit --no-fund
  
  echo "Gerando cliente do Prisma e tabelas do banco..."
  npx prisma generate
  npx prisma db push --skip-generate
  
  cd ..
  echo -e "\n${GREEN}Instalação Node concluída com sucesso!${NC}"
  echo -e "Como iniciar:\n  cd server\n  node index.js"
  echo -e "Acesse a interface carregada em: http://localhost:3000"

elif [ "$RUN_MODE" == "2" ]; then
  echo -e "\n${BLUE}======================================================${NC}"
  echo -e "${BLUE} Iniciando Instalação via Docker                      ${NC}"
  echo -e "${BLUE}======================================================${NC}"
  
  if command -v docker-compose &> /dev/null; then
    DOCKER_CMD="docker-compose"
  else
    DOCKER_CMD="docker compose"
  fi
  
  $DOCKER_CMD up -d --build
  
  echo "Aguardando 10 segundos para o banco/container backend respirar..."
  sleep 10
  
  echo "Rodando migrations do Prisma dentro do container..."
  docker exec crm_celular_backend npx prisma generate
  docker exec crm_celular_backend npx prisma db push --skip-generate
  
  echo -e "\n${GREEN}Instalação Docker concluída com sucesso!${NC}"
  echo -e "A interface (Nginx) está rodando na porta 80. Acesse no navegador: http://localhost"
fi

echo -e "\n${BLUE}Finalizado! Aproveite o Gestão Celular.${NC}\n"
