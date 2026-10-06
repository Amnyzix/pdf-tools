FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ghostscript \
    qpdf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY src ./src
COPY public ./public

EXPOSE 3000
CMD ["node", "server.js"]