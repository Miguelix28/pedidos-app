import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthRedirectService {
  private redirectUrl: string = '/';

  setRedirectUrl(url: string): void {
    console.log('URL guardada para redirigir:', url);
    this.redirectUrl = url;
  }

  getRedirectUrl(): string {
    const url = this.redirectUrl !== '/' ? this.redirectUrl : '/admin';
    this.redirectUrl = '/'; // Resetea después
    console.log('Redirigiendo a:', url);
    return url;
  }
}