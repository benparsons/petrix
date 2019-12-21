FROM node:12
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3584
CMD [ "node", "index.js" ]
