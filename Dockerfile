FROM node:carbon

WORKDIR ./

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 3123
CMD [ "npm", "start" ]