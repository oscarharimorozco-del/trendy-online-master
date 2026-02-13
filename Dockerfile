# Usar una imagen de Node con soporte para Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

# Cambiar al usuario root para instalar dependencias si es necesario
USER root

# Crear directorio de la app
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Variables de entorno por defecto (Se pueden sobreescribir en la nube)
ENV NODE_ENV=production

# Comando para arrancar el bot
CMD ["node", "whatsapp-bot.js"]
