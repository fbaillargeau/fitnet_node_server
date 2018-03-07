FROM node:carbon

WORKDIR ./

COPY package.json ./

ENV REDIS_PORT=6379
ENV REDIS_HOST=192.168.99.100
ENV INTERVAL=20000
RUN npm install

COPY . .

EXPOSE 3123
CMD [ "npm", "start" ]