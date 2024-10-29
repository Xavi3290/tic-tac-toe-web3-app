import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { GameComponent } from './game/game.component';
import { RegisterComponent } from './register/register.component';
import { LobbyComponent } from './lobby/lobby.component';


export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },  // Ruta por defecto redirige al login
    { path: 'login', component: LoginComponent },          // Ruta para login
    { path: 'game/:id', component: GameComponent },            // Ruta para game
    { path: 'register', component: RegisterComponent },     // Ruta para register
    { path: 'lobby', component: LobbyComponent }            // Ruta para lobby
  ];