FROM node:12
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3584
RUN npx tsc *.ts
CMD [ "node", "index.js" ]
