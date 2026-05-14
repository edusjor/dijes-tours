FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /app/comprobantes

EXPOSE 40353

CMD ["npm", "start"]
