FROM node:latest
LABEL version="3.0"
LABEL description="Blockchain via node.js & MongoDb"

WORKDIR /app

COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn --production

COPY src/ /app/src

EXPOSE 2100 2000 

ENV NODE_ENV development
ENV DEBUG blockjs:*

CMD ["yarn" ,"start"]
