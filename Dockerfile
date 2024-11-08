# Dockerfile

FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Créer le répertoire bdd avec les bonnes permissions pour éviter les erreurs de type EACCES: permission denied
RUN mkdir -p bdd && chmod -R 777 bdd

ENV PORT=5010

EXPOSE 5010

CMD ["npm", "start"]