import { inject, Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { of, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private redirectService = inject(AuthRedirectService);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    // 🔐 Paso 1: Si ya hay sesión en sessionStorage, permitir el acceso directamente
    const isLoggedIn = sessionStorage.getItem('loggedIn') === 'true';
    if (isLoggedIn) {
      return of(true);
    }

    // 🧠 Paso 2: Si no hay sessionStorage, verificar usuario autenticado y rol desde Firestore
    return user(this.auth).pipe(
      switchMap(user => {
        if (!user) {
          console.log('Acceso denegado - Usuario no autenticado');
          this.redirectService.setRedirectUrl(state.url);
          this.router.navigate(['/login']);
          return of(false);
        }

        const userRef = doc(this.firestore, `users/${user.uid}`);
        return from(getDoc(userRef)).pipe(
          map(snapshot => {
            const userData = snapshot.data();
            const isAdmin = userData?.['role'] === 'admin';

            if (!isAdmin) {
              console.log('Acceso denegado - Usuario no es administrador');
              this.router.navigate(['/']);
            }

            // 🧠 Si es admin, guardar sesión por si recarga después
            if (isAdmin) {
              sessionStorage.setItem('loggedIn', 'true');
            }

            return isAdmin;
          })
        );
      })
    );
  }
}
