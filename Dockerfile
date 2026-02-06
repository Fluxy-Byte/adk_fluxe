# Imagem base Node
FROM node:20-alpine

# Diretório da aplicação
WORKDIR /app

# Copia package.json e lock
COPY package*.json ./

# Inicia conexão com bancos de dados
RUN npx prisma generate --schema=prisma/postgres.prisma
RUN npx prisma generate --schema=prisma/mongo.prisma

# Instala dependências
RUN npm install

# Copia o resto do projeto
COPY . .

# Compila o TypeScript
RUN npm run build

# Expõe a porta do Express (mude se usar outra)
EXPOSE 5096

# Inicia a aplicação
CMD ["npm", "start"] 