import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../services/google.auth.service';
import { AuthRedirectService } from '../../services/auth-redirect.service';
import { Auth, getRedirectResult, user } from '@angular/fire/auth';

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
      private auth: Auth,
      private redirectService: AuthRedirectService
    ) {}

    async ngOnInit(): Promise<void> {
      // ⚠️ Espera a que se complete el redirect de Google si lo hubo
      try {
        console.log('Esperando resultado de redirección...');
        const result = await this.authService.getRedirectAuthResult();
        console.log('Resultado del redirect:', result);
        const user = result?.user;
    
        if (user) {
          sessionStorage.setItem('loggedIn', 'true');
          sessionStorage.setItem('uid', user.uid);
          sessionStorage.setItem('displayName', user.displayName || '');
          await this.authService.updateUserData(user);
          this.router.navigate(['/admin']);
          return;
        }
      } catch (error) {
        console.error('Error al obtener resultado del redirect:', error);
      }
    
      // Si ya está logueado por sesión, redirige
      if (this.authService.isLoggedIn()) {
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
          // const redirectUrl = this.redirectService.getRedirectUrl();
          // this.router.navigate([redirectUrl || '/admin']);
        }, 800); // Este tiempo debe coincidir con la duración de la animació
      } catch (error) {
        console.error('Error al iniciar sesión con Google:', error);
        this.errorMessage = 'Error al iniciar sesión. Por favor intenta nuevamente.';
      } finally {
        this.loading = false;
      }
    }
    
  }