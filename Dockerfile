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

# Inicia conexão com bancos de dados
RUN npx prisma generate

# Expõe a porta do Express (mude se usar outra)
EXPOSE 8000

# Inicia a aplicação
CMD ["npm", "start"] 