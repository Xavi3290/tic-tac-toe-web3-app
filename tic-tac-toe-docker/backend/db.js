// tres-en-raya-backend/db.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Cargar las variables de entorno desde el archivo .env
dotenv.config();

// Crear la conexión a la base de datos de manera asíncrona usando una promesa
async function initializeDatabase() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('Connected to MySQL database');

    // Crear tablas si no existen
    await createTables(db);

    return db; // Retornar la conexión a la base de datos para que se pueda usar en otros módulos
  } catch (error) {
    console.error('Error connecting to MySQL database:', error.message);
    throw error; // Lanza el error si no se puede conectar
  }
}

// Función para crear tablas
async function createTables(db) {
  try {
    // Crear la tabla 'users' si no existe
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(createUsersTable);
    console.log('Table "users" ready');
  } catch (error) {
    console.error('Error creating "users" table:', error.message);
  }

  // Repetir para las demás tablas
  try {
    const createGamesTable = `
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player1_id INT,
        player2_id INT,
        board VARCHAR(9) NOT NULL,
        turn INT DEFAULT NULL,
        winner_id INT,
        status VARCHAR(50) DEFAULT 'in progress',
        state ENUM('open', 'closed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player1_id) REFERENCES users(id),
        FOREIGN KEY (player2_id) REFERENCES users(id)
      );
    `;
    await db.query(createGamesTable);
    console.log('Table "games" ready');
  } catch (error) {
    console.error('Error creating "games" table:', error.message);
  }

  try {
    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT,
        user_id INT,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;
    await db.query(createMessagesTable);
    console.log('Table "messages" ready');
  } catch (error) {
    console.error('Error creating "messages" table:', error.message);
  }

  try {
    const createPlayerStatsTable = `
      CREATE TABLE IF NOT EXISTS player_stats (
        player_id INT PRIMARY KEY,
        wins INT DEFAULT 0,
        draws INT DEFAULT 0,
        losses INT DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES users(id)
      );
    `;
    await db.query(createPlayerStatsTable);
    console.log('Table "player_stats" ready');
  } catch (error) {
    console.error('Error creating "player_stats" table:', error.message);
  }
}

// Exportar la función de inicialización de la base de datos
module.exports = { initializeDatabase };