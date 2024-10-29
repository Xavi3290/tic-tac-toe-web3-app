# Usa la imagen oficial de MySQL
FROM mysql:8.0

# Define las variables de entorno para configurar MySQL
ENV MYSQL_DATABASE=tres_en_raya
ENV MYSQL_ROOT_PASSWORD=12345

# Copia los archivos de inicialización de base de datos si existen
# (si tienes scripts .sql para poblar tu base de datos)
# COPY ./init.sql /docker-entrypoint-initdb.d/

# Exponer el puerto de MySQL
EXPOSE 3306
