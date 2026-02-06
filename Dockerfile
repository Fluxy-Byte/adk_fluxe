# Imagem base Node
FROM node:20-alpine

# Diretório da aplicação
WORKDIR /app

# Copia package.json e lock
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o resto do projeto
COPY . .

# Compila o TypeScript
RUN npm run build

# Expõe a porta do Express (mude se usar outra)
EXPOSE 8000

# Inicia a aplicação
CMD ["npx", "adk api_server"] 