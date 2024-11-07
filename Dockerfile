# Dockerfile

FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=5121

EXPOSE 5121

CMD ["npm", "start"]