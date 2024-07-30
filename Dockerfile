FROM node:18.17.1
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
RUN PUPPETEER_SKIP_DOWNLOAD=true yarn install
COPY . .
