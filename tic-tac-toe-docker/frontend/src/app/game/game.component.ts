import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { WebSocketSubject } from 'rxjs/webSocket';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent implements OnInit{
  board: string[] = [];
  playerId: number | null = null;
  gameId: number | null = null;
  turn: number | null = null;
  winner: number | null = null;
  draw: boolean = false;
  chatMessages: { playerId: number, message: string }[] = [];
  newMessage: string = '';
  ws: WebSocketSubject<any>;


  constructor (private router: Router) {
    this.ws = new WebSocketSubject('ws://localhost:3000'); 
  }

  ngOnInit(): void {
    const storedGameId = sessionStorage.getItem('gameId');
    const storedBoard = sessionStorage.getItem('board');
    const storedTurn = sessionStorage.getItem('turn');
    const storedUserId = sessionStorage.getItem('userId');

    console.log(`Loaded from sessionStorage - gameId: ${storedGameId}, board: ${storedBoard}, turn: ${storedTurn}, userId: ${storedUserId}`);


    this.gameId = storedGameId ? parseInt(storedGameId, 10) : null;
    this.board = storedBoard ? storedBoard.split('') : Array(9).fill('-');
    this.turn = storedTurn ? parseInt(storedTurn, 10) : null;
    this.playerId = storedUserId ? parseInt(storedUserId, 10) : null;

    // Registrar al jugador en el WebSocket
    if (this.gameId && this.playerId) {
      this.registerInWebSocket();
    }

    // Escuchar mensajes de WebSocket
    this.ws.subscribe({
      next: (message) => this.handleWebSocketMessage(message),
      error: (err) => console.error(err),
      complete: () => console.log('WebSocket closed')
    });
  }

  registerInWebSocket(): void {
    // Enviar mensaje para registrar al jugador en la partida
    console.log(`Registering player ${this.playerId} in game ${this.gameId}`);
    this.ws.next({
      type: 'register',
      playerId: this.playerId,
      gameId: this.gameId
    });
  }

  handleWebSocketMessage(message: any): void {
    console.log('Received WebSocket message:', message);
  
    if (message.type === 'register' && message.success) {
      console.log(`Player ${this.playerId} registered successfully in game ${this.gameId}`);
    } else if (message.board) {
      // Si el mensaje tiene un tablero, actualizar el estado del juego
      console.log(`Updating board with move: ${message.board}`);
      this.board = Array.isArray(message.board) ? message.board : message.board.split('');
      this.turn = message.turn;
      this.winner = message.winner;
      this.draw = message.draw;
  
      sessionStorage.setItem('board', this.board.join(''));
      sessionStorage.setItem('turn', String(this.turn));

    } else if (message.type === 'chat') {
      // Manejar mensajes de chat
      this.chatMessages.push({ playerId: message.playerId, message: message.message });
    } else {
      console.log('Unhandled message type:', message);
    }
  }  
    
  async makeMove(position: number): Promise<void> {
    console.log(`Player ${this.playerId} trying to move on position ${position}, current turn: ${this.turn}`);
  
    if (this.turn !== this.playerId) {
      console.log('Not your turn');
      return;
    }
    
    if (this.board[position] !== '-') {
      console.log('Position already taken');
      return;
    }
  
    // Enviar el movimiento a través del WebSocket
    console.log(`Sending move from player ${this.playerId} at position ${position}`);
    this.ws.next({
      type: 'move',
      gameId: this.gameId,
      playerId: this.playerId,
      position: position
    });
  }
    
  sendMessage(): void {
    if (this.newMessage.trim() === '') return; // No enviar mensajes vacíos

    // Enviar el mensaje de chat a través del WebSocket
    this.ws.next({
      type: 'chat',
      gameId: this.gameId,
      playerId: this.playerId,
      message: this.newMessage.trim()
    });

    this.newMessage = '';
  } 

  goToLobby(): void {
    this.router.navigate(['/lobby']);
  }
}
