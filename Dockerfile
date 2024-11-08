# Dockerfile

FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=5010

EXPOSE 5010

CMD ["npm", "start"]