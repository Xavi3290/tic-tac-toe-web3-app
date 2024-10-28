import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  confirmPassword: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.checkMetaMaskConnection();
  }

  // Función para enviar los datos de registro
  async onSubmit() {
    // Validar formato de email
    if (!this.isEmailValid(this.username)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    // Validar que las contraseñas coincidan
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    const registerData = {
      username: this.username,
      password: this.password
    };

    try {
      // Realiza la solicitud de registro
      const response = await firstValueFrom(
        this.http.post('http://localhost:3000/register', registerData)
      );
      console.log('Rgistration successful', response);

      // Redirigir al login después del registro
      this.router.navigate(['/']);
    } catch (error) {
      this.errorMessage = 'Registration error. Please make sure your email and password are valid.';
      console.error('Registration error', error);
    }
  }

  // Validar el formato de email usando una expresión regular simple
  isEmailValid(email: string): boolean {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
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
