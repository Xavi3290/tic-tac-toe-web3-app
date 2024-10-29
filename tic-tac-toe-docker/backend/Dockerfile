# Usa una imagen base de Node.js
FROM node:18

# Instalar netcat-openbsd y default-mysql-client para verificar la conexión a MySQL
RUN apt-get update && apt-get install -y netcat-openbsd default-mysql-client

# Crear el directorio de trabajo
WORKDIR /app

# Copiar el archivo package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todos los archivos del backend
COPY . .

# Exponer el puerto del backend
EXPOSE 3000

# Iniciar el backend
CMD ["npm", "start"]
