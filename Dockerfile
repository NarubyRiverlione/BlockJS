FROM node:latest
LABEL version="4.0"
LABEL description="Blockchain via node.js & MongoDb"

WORKDIR /app

COPY package.json package.json

RUN npm install --production

COPY src/ /app/src

EXPOSE 2100 2000

ENV NODE_ENV development
ENV DEBUG blockjs:*
ENV apiPassword test

CMD ["npm" ,"start"]
