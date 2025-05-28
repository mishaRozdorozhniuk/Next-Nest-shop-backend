FROM node:20

WORKDIR /app

COPY package*.json ./

COPY . .
RUN npm install

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
