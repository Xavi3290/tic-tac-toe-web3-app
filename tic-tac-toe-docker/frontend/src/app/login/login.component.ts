import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.checkMetaMaskConnection();
  }

  // Función para enviar los datos de inicio de sesión
  async onSubmit() {
    const loginData = {
      username: this.username,
      password: this.password
    };

    try {
      // Realiza la solicitud de inicio de sesión
      const response: any = await firstValueFrom(
        this.http.post('http://localhost:3000/login', loginData)
      );
      console.log('Login successful', response);

      // Guardar el userId en sessionStorage cuando el login es exitoso
      sessionStorage.setItem('userId', response.userId);

      // Redirigir a la pantalla del lobby si el login es exitoso
      this.router.navigate(['/lobby']);
    } catch (error) {
      this.errorMessage = 'Invalid email or password';
      console.log('Login error', error);
    }
  }

  register () {
    this.router.navigate(['/register']);
  }

  // Verificación de MetaMask
  async checkMetaMaskConnection() {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length === 0) {
          alert("Please connect to MetaMask to access blockchain features.");
        } else {
          console.log("MetaMask connected:", accounts[0]);
        }
      } catch (error) {
        alert("MetaMask connection request was rejected. Please connect to use blockchain features.");
        console.error("Error checking MetaMask connection:", error);
      }
    } else {
      alert("MetaMask is not installed! Please install MetaMask to use blockchain features.");
    }
  }

}
