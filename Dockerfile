# 1. Image de base Node.js légère compatible PC et Raspberry Pi (ARM)
FROM node:20-slim

# 2. Installation automatique de Ghostscript et QPDF dans le conteneur
RUN apt-get update && apt-get install -y \
    ghostscript \
    qpdf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Création du dossier de l'application
WORKDIR /app

# 4. Copie et installation des dépendances Node (express, multer)
COPY package*.json ./
RUN npm install --production

# 5. Copie du reste de ton code (server.js et dossier public/)
COPY . .

# 6. Ouverture du port 3000 et démarrage
EXPOSE 3000
CMD ["node", "server.js"]