# Usa una imagen base de Node.js para Angular
FROM node:18

# Crear el directorio de trabajo
WORKDIR /app

# Copiar el archivo package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias y construir la aplicación
RUN npm install

# Copiar todos los archivos del frontend
COPY . .

# Exponer el puerto de desarrollo de Angular
EXPOSE 4200

# Iniciar el frontend con ng serve configurado para escuchar en todas las interfaces
CMD ["npx", "ng", "serve", "--host", "0.0.0.0"]
