// tres-en-raya-backend/index.js
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./db');  // Importar la inicialización de la base de datos
const bcrypt = require('bcrypt');
const { WebSocketServer } = require('ws');
const http = require('http');

// Web3
require("dotenv").config();
const { ethers } = require("ethers");

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Permitir solicitudes desde otros dominios (Cross-Origin Resource Sharing)
app.use(express.json()); // Permitir que el servidor procese JSON en el cuerpo de las solicitudes

// Función asíncrona para manejar la lógica del servidor
async function startServer() {
  try {
    // Inicializar la base de datos y esperar hasta que esté lista
    const db = await initializeDatabase(); 
    console.log('Base de datos inicializada con éxito.');

    // Crear un servidor HTTP que soportará WebSockets
    const server = http.createServer(app);

    // Crear un servidor WebSocket vinculado al servidor HTTP
    const wss = new WebSocketServer({ server });

    // Mapa para rastrear jugadores por juego
    const games = new Map(); // Estructura: { gameId -> { playerId -> ws } }

    // Iniciar el servidor
    server.listen(port, () => {
      console.log(`Servidor escuchando en http://localhost:${port}`);
    });

    // Rutas utilizando async/await
    app.post('/register', async (req, res) => {
      // Registro de usuarios
      const { username, password } = req.body;
      try {
        // Comprobar si el usuario ya existe
        const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (results.length > 0) {
          return res.status(400).json({ message: 'User already exists' });
        }

        // Si no existe, hashear la contraseña y guardar en la base de datos
        const hashedPassword = await bcrypt.hash(password, 10);
        const [insertResult] = await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

        // Obtener el ID del nuevo usuario registrado
        const newUserId = insertResult.insertId;

        // Insertar en Blockchain i BD el nuevo usuario en la tabla de estadísticas con valores iniciales en 0
        await db.query('INSERT INTO player_stats (player_id, wins, draws, losses) VALUES (?, 0, 0, 0)', [newUserId]);
        await registerPlayerBlockchain(newUserId);  

        res.status(201).json({ message: 'User successfully registered' });
      } catch (error) {
        console.error('Error registering user:', error.message);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // Ruta par hacer el login
    app.post('/login', async (req, res) => {
      // Iniciar sesión
      const { username, password } = req.body;

      try {
        // Buscar al usuario en la base de datos
        const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (results.length === 0) {
          return res.status(400).json({ message: 'User not found' });
        }

        const user = results[0];
        // Comparar la contraseña ingresada con la almacenada en la base de datos
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return res.status(400).json({ message: 'Incorrect password' });
        }

        res.status(200).json({ message: 'Login successful', userId: user.id });
      } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // Unirse a una partida abierta
    app.post('/games/join', async (req, res) => {
      const { player_id } = req.body;

      try {
        // Buscar una partida abierta (state = "open")
        const [results] = await db.query('SELECT * FROM games WHERE state = "open" LIMIT 1');

        if (results.length === 0) {
          // Si no hay partidas abiertas, crear una nueva
          const board = '---------'; // Inicializar el tablero vacío (9 espacios)
          const [result] = await db.query('INSERT INTO games (player1_id, board, turn) VALUES (?, ?, ?)', [player_id, board, player_id]);

          res.status(201).json({
            message: 'Game created',
            gameId: result.insertId,
            board,
            turn: player_id,
            state: 'open'
          });
        } else {
          // Si hay una partida abierta, unirse a ella
          const game = results[0];
          await db.query('UPDATE games SET player2_id = ? WHERE id = ?', [player_id, game.id]);

          res.status(200).json({
            message: 'Game joined',
            gameId: game.id,
            board: game.board,
            turn: game.player1_id,
            state: 'open'
          });
        }
      } catch (error) {
        console.error('Error joining game:', error.message);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // Ruta para obtener el historial de mensajes de una partida
    app.get('/games/:gameId/messages', async (req, res) => {
      const { gameId } = req.params;  // Obtener el gameId de los parámetros de la URL

      try {
        // Consulta para obtener los mensajes de la partida, ordenados por fecha
        const [results] = await db.query('SELECT * FROM messages WHERE game_id = ? ORDER BY created_at ASC', [gameId]);

        // Si no hay mensajes, devolver un array vacío
        if (results.length === 0) {
          return res.status(200).json([]);
        }

        // Devolver todos los mensajes
        res.status(200).json(results);
      } catch (error) {
        console.error('Error retrieving messages:', error.message);
        res.status(500).json({ message: 'Server error retrieving messages' });
      }
    });

    // Ruta para obtener las estadísticas de un jugador
    app.get('/players/:playerId/stats', async (req, res) => {
      const { playerId } = req.params; // Obtener el playerId de los parámetros de la URL

      try {
        // Consulta para obtener las estadísticas del jugador
        const [results] = await db.query('SELECT * FROM player_stats WHERE player_id = ?', [playerId]);

        // Si el jugador no tiene estadísticas
        if (results.length === 0) {
          return res.status(404).json({ message: 'Player not found' });
        }

        // Devolver las estadísticas del jugador
        res.status(200).json(results[0]);
      } catch (error) {
        console.error('Error retrieving player stats:', error.message);
        res.status(500).json({ message: 'Server error retrieving player stats' });
      }
    });

    // Ruta para obtener las estadísticas de un jugador en la blockchain
    app.get('/players/:playerId/stats/blockchain', async (req, res) => {
      const { playerId } = req.params;
      
      try {
        // Asegúrate de convertir el playerId en la dirección de Ethereum del jugador
        const stats = await getPlayerStatsFromBlockchain(playerId);
        if (!stats) {
          return res.status(404).json({ message: 'Player not found in blockchain' });
        }
    
        res.status(200).json({
          player_id: stats.player_id.toString(),
          wins: stats.wins.toString(),
          draws: stats.draws.toString(),
          losses: stats.losses.toString()
        });
      } catch (error) {
        console.error("Error fetching blockchain player stats:", error);
        res.status(500).json({ message: 'Server error fetching blockchain stats' });
      }
    });    

    // Lógica del WebSocket usando async/await
    wss.on('connection', (ws) => {
      console.log('A new player connected'); // Mensaje cuando un jugador se conecta

      ws.on('message', async (message) => {
        const data = JSON.parse(message.toString()); // Parsear el mensaje entrante desde WebSocket

        // Registro del jugador en el WebSocket
        if (data.type === 'register') {
          const { playerId, gameId } = data;
          try {
            // Obtener la partida
            const [results] = await db.query('SELECT * FROM games WHERE id = ?', [gameId]);

            if (results.length === 0) {
              return ws.send(JSON.stringify({ message: 'Game not found' })); // Si la partida no existe
            }

            const game = results[0];

            // Verificar si el jugador está registrado en la partida
            if (game.player1_id !== playerId && game.player2_id !== playerId) {
              return ws.send(JSON.stringify({ message: 'Player not part of this game' })); // Jugador no registrado en la partida
            }

            // Verificar el estado de la partida
            if (game.state === 'closed') {
              return ws.send(JSON.stringify({ message: 'Game is closed' })); 
            }

            // Añadir al jugador a la lista de WebSocket de la partida
            if (!games.has(gameId)) {
              games.set(gameId, new Map());
            }
            games.get(gameId).set(playerId, ws);

            // Confirmar registro
            ws.send(JSON.stringify({ message: 'Registered successfully in game ' + gameId }));

            // Si es el segundo jugador, cerrar la partida
            if (game.player2_id === playerId) {
              await db.query('UPDATE games SET state = "closed" WHERE id = ?', [game.id]);
            }

          } catch (error) {
            console.error('Error finding game:', error.message);
            ws.send(JSON.stringify({ message: 'Error finding game' }));
          }
        }

        // Lógica para manejar movimientos
        if (data.type === 'move') {
          const { gameId, playerId, position } = data;
          handleMove(gameId, playerId, position, ws); // Llamar a la función que maneja el movimiento
        }

        // Lógica para manejar mensajes de chat
        if (data.type === 'chat') {
          const { gameId, playerId, message } = data;

          try {
            // Insertar mensaje en la base de datos
            await db.query('INSERT INTO messages (game_id, user_id, message) VALUES (?, ?, ?)', [gameId, playerId, message]);

            // Enviar el mensaje a todos los jugadores en la partida
            const gamePlayers = games.get(gameId);
            if (gamePlayers) {
              gamePlayers.forEach((clientWs, id) => {
                if (clientWs.readyState === ws.OPEN) {
                  clientWs.send(JSON.stringify({
                    type: 'chat',
                    playerId,
                    message,
                    createdAt: new Date().toISOString() // Añadir marca de tiempo al mensaje
                  }));
                }
              });
            }
          } catch (error) {
            console.error('Error saving message:', error.message);
            ws.send(JSON.stringify({ message: 'Error saving message' }));
          }
        }
      });

      // Lógica para manejar la desconexión de un jugador
      ws.on('close', () => {
        games.forEach((players, gameId) => {
          players.forEach((clientWs, playerId) => {
            if (clientWs === ws) {
              players.delete(playerId); // Eliminar al jugador de la lista de la partida
            }
          });
        });
      });
    });

    // Función para manejar un movimiento del jugador
    async function handleMove(gameId, playerId, position, ws) {
      try {
        // Verificar que la partida existe
        const [results] = await db.query('SELECT * FROM games WHERE id = ?', [gameId]);

        if (results.length === 0) {
          return ws.send(JSON.stringify({ message: 'Game not found' }));
        }

        const game = results[0];

        // Verificar que es el turno del jugador
        if (game.turn !== playerId) {
          return ws.send(JSON.stringify({ message: 'Not your turn' }));
        }

        // Verificar que la posición del movimiento es válida
        if (position < 0 || position > 8 || game.board[position] !== '-') {
          return ws.send(JSON.stringify({ message: 'Invalid move' }));
        }

        // Actualizar el tablero del juego
        const updatedBoard = game.board.split('');
        updatedBoard[position] = playerId === game.player1_id ? 'X' : 'O';
        const newBoard = updatedBoard.join('');

        // Verificar si hay un ganador o si es empate
        const winner = checkWinner(newBoard);
        const isDraw = !winner && newBoard.indexOf('-') === -1;

        // Actualizar el estado del juego en la base de datos
        const status = winner ? 'finished' : (isDraw ? 'draw' : 'in progress');
        const nextTurn = winner || isDraw ? null : (playerId === game.player1_id ? game.player2_id : game.player1_id);

        await db.query('UPDATE games SET board = ?, turn = ?, winner_id = ?, status = ? WHERE id = ?', 
          [newBoard, nextTurn, winner ? playerId : null, status, gameId]);

        // Enviar la actualización a todos los jugadores
        const gameUpdate = {
          gameId,
          board: newBoard,
          winner: winner ? playerId : null,
          draw: isDraw,
          turn: nextTurn
        };

        const gamePlayers = games.get(gameId);
        if (gamePlayers) {
          gamePlayers.forEach((clientWs, id) => {
            if (clientWs.readyState === ws.OPEN) {
              clientWs.send(JSON.stringify(gameUpdate));
            }
          });
        }

        // Si el juego termina, manejar el final de la partida
        if (status === 'finished' || isDraw) {
          handleEndOfGame(gameId, winner ? playerId : null, isDraw);
        }
      } catch (error) {
        console.error('Error updating game:', error.message);
        ws.send(JSON.stringify({ message: 'Error updating the game' }));
      }
    }

    // Función para manejar el final del juego y actualizar las estadísticas
    async function handleEndOfGame(gameId, winnerId, isDraw) {
      try {
        const [result] = await db.query('SELECT player1_id, player2_id FROM games WHERE id = ?', [gameId]);
        const { player1_id, player2_id } = result[0];

        if (isDraw) {
          // Actualizar las estadísticas de empate para ambos jugadores
          await db.query('UPDATE player_stats SET draws = draws + 1 WHERE player_id IN (?, ?)', [player1_id, player2_id]);
          await updateStatsBlockchain(player1_id, 0, 1, 0);
          await updateStatsBlockchain(player2_id, 0, 1, 0);
        } else {
          // Actualizar estadísticas de victoria para el ganador y derrota para el perdedor
          const loserId = (winnerId === player1_id) ? player2_id : player1_id;
          await db.query('UPDATE player_stats SET wins = wins + 1 WHERE player_id = ?', [winnerId]);
          await updateStatsBlockchain(winnerId, 1, 0, 0);
          await db.query('UPDATE player_stats SET losses = losses + 1 WHERE player_id = ?', [loserId]);
          await updateStatsBlockchain(loserId, 0, 0, 1);
        }
      } catch (error) {
        console.error('Error updating player stats:', error.message);
      }
    }

  } catch (error) {
    console.error('Error starting server:', error.message);
  }
}

// Función para verificar si hay un ganador en el tablero
function checkWinner(board) {
  // Definir las combinaciones ganadoras (filas, columnas y diagonales)
  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
    [0, 4, 8], [2, 4, 6]  // Diagonales
  ];

  // Iterar sobre todas las combinaciones ganadoras
  for (const combination of winningCombinations) {
    const [a, b, c] = combination;
    
    // Si las posiciones a, b, y c son iguales (X o O) y no son '-', hay un ganador
    if (board[a] !== '-' && board[a] === board[b] && board[a] === board[c]) {
      return true;  // Ganador encontrado
    }
  }

  // Si no se encuentra un ganador, retornar false
  return false;
}


// Iniciar el servidor llamando a la función
startServer();




// Configuración de Web3 para interactuar con el contrato PlayerStats

// Variables de entorno
const ALCHEMY_SEPOLIA_URL = process.env.ALCHEMY_SEPOLIA_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PLAYER_STATS_ADDRESS = process.env.PLAYER_STATS_ADDRESS;
const ABI = [
  // Pega aquí el ABI de PlayerStats (el contenido de artifacts/contracts/PlayerStats.sol/PlayerStats.json)
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "player_id",
        "type": "uint256"
      }
    ],
    "name": "PlayerRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "player_id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "wins",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "draws",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "losses",
        "type": "uint256"
      }
    ],
    "name": "StatsUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "player_id",
        "type": "uint256"
      }
    ],
    "name": "getStatsByPlayerId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "playerAddressById",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "player_id",
        "type": "uint256"
      }
    ],
    "name": "registerPlayer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "player_id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "wins",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "draws",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "losses",
        "type": "uint256"
      }
    ],
    "name": "updateStats",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Configuración del proveedor de red y la cuenta de signatario
const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_SEPOLIA_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Crear una instancia del contrato
const playerStatsContract = new ethers.Contract(PLAYER_STATS_ADDRESS, ABI, wallet);

// Registro de un jugador en la blockchain
async function registerPlayerBlockchain(playerId) {
  try {
    const tx = await playerStatsContract.registerPlayer(playerId);
    await tx.wait();  // Espera a que la transacción se confirme
    console.log(`Player successfully registered, tx hash: ${tx.hash}`);
  } catch (error) {
    console.error("Error registering player:", error);
  }
}

// Modificar los stats añadiendo valores a cada stat
async function updateStatsBlockchain(playerId, addedWins, addedDraws, addedLosses) {
  try {
    const tx = await playerStatsContract.updateStats(playerId, addedWins, addedDraws, addedLosses);
    await tx.wait();  // Espera a que la transacción se confirme
    console.log(`Player ID ${playerId} stats updated: Wins +${addedWins}, Draws +${addedDraws}, Losses +${addedLosses}, tx hash: ${tx.hash}`);
  } catch (error) {
    console.error("Error updating player stats:", error);
  }
}

// Consultar estadísticas del jugador en blockchain usando player_id
async function getPlayerStatsFromBlockchain(playerId) {
  try {
    const [player_id, wins, draws, losses] = await playerStatsContract.getStatsByPlayerId(playerId);
    console.log(`Player stats - ID: ${player_id}, Wins: ${wins}, Draws: ${draws}, Losses: ${losses}`);
    return { player_id, wins, draws, losses };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return null;
  }
}
