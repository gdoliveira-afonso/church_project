# Etapa 1: Build da aplicação (Node)
FROM node:20-alpine AS builder

# Configurar diretório de trabalho no container
WORKDIR /app

# Copiar apenas os arquivos gerenciadores de pacotes primeiro (melhora o cache do Docker)
COPY package*.json ./

# Instalar dependências (sem gerar audit para ser mais rápido)
RUN npm install --no-audit --no-fund

# Copiar todo o resto do código da aplicação
COPY . .

# Rodar o Vite para empacotar o JS/CSS/HTML na pasta /app/dist
RUN npm run build

# ==========================================

# Etapa 2: Servidor Web Leve de Produção (Nginx)
FROM nginx:alpine

# Copiar a configuração personalizada do Nginx que lida com as rotas Single Page
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar a pasta 'dist' gerada na Etapa 1 para o servidor Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor a porta 80 do container
EXPOSE 80

# Comando padrão para rodar o nginx sem ir pro background
CMD ["nginx", "-g", "daemon off;"]
