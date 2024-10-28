import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css'
})
export class LobbyComponent implements OnInit{
  stats: any = null;
  statsBlockchain: any = null;
  userId: number | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    // Obtener el playerId de sessionStorage
    const storedUserId = sessionStorage.getItem('userId');
    this.userId = storedUserId ? parseInt(storedUserId, 10) : null;

    if (this.userId) {
      this.getUserStats();
    } else {
      // Si no hay playerId, redirigir al login
      this.router.navigate(['/login'])
    }
  }

  async getUserStats() {
    try {
      this.stats = await firstValueFrom(
        this.http.get(`http://localhost:3000/players/${this.userId}/stats`)
      );
      this.statsBlockchain = await firstValueFrom(
        this.http.get(`http://localhost:3000/players/${this.userId}/stats/blockchain`)
      );
      console.log('Blockchain Stats:', this.statsBlockchain);
    } catch (error) {
      console.error('Error fetching player stats', error);
    }
  }  

  async joinOrCreateGame() {
    try {
      const gameData: any = await firstValueFrom(
        this.http.post('http://localhost:3000/games/join', { player_id: this.userId })
      );
      
      // Evitar que un jugador juegue contra sí mismo
      if (gameData.player1_id === this.userId && gameData.player2_id === this.userId) {
        console.error('You cannot play against yourself.');
        return;
      }
  
      // Guardar el gameId, el tablero, y el turno en sessionStorage
      sessionStorage.setItem('gameId', gameData.gameId);
      sessionStorage.setItem('board', gameData.board);
      sessionStorage.setItem('turn', gameData.turn);
  
      this.router.navigate(['/game', gameData.gameId]);
    } catch (error) {
      console.error('Error joining or creating game', error);
    }
  }
   
}
