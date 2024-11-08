# Dockerfile

FROM node:18

WORKDIR /app

RUN echo "SESSION_SECRET=$(openssl rand -hex 64)" >> .env

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=5010

EXPOSE 5010

CMD ["npm", "start"]