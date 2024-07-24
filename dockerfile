# Usa una imagen base oficial de Node.js 20
FROM node:20

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos package.json y package-lock.json al directorio de trabajo
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install

# Copia todos los archivos del proyecto al directorio de trabajo
COPY . .

# Compila el código TypeScript
RUN npx tsc

# Expone el puerto en el que la aplicación estará corriendo
EXPOSE 3001

# Define el comando por defecto que se ejecutará cuando el contenedor se inicie
CMD ["npm", "run", "dev"]
