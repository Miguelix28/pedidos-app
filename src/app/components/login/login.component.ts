import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../services/google.auth.service';
import { AuthRedirectService } from '../../services/auth-redirect.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
    errorMessage: string = '';
    loading: boolean = false;
    loggedIn: boolean = false;
  
    constructor(
      private authService: GoogleAuthService,
      private router: Router,
      private redirectService: AuthRedirectService
    ) {}

    ngOnInit(): void {
      if (this.authService.isLoggedIn()) {
        // Redirige directamente a admin si ya hay sesión
        this.router.navigate(['/admin']);
      }
    }
  
    async signInWithGoogle() {
      if (this.loading) return; // Previene múltiples clics
      this.loading = true;
    
      try {
        await this.authService.googleSignIn();
        this.loggedIn = true;
        setTimeout(() => {
          const redirectUrl = this.redirectService.getRedirectUrl();
          this.router.navigate([redirectUrl || '/admin']);
        }, 800); // Este tiempo debe coincidir con la duración de la animació
      } catch (error) {
        console.error('Error al iniciar sesión con Google:', error);
        this.errorMessage = 'Error al iniciar sesión. Por favor intenta nuevamente.';
      } finally {
        this.loading = false;
      }
    }
    
  }