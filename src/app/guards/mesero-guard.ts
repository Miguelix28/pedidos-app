import { inject, Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { of, from } from 'rxjs';
import { switchMap, map, catchError, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MeseroGuard implements CanActivate {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private redirectService = inject(AuthRedirectService);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return user(this.auth).pipe(
      take(1),
      switchMap((currentUser) => {
        if (!currentUser) {
          this.redirectService.setRedirectUrl(state.url);
          this.router.navigate(['/login']);
          return of(false);
        }

        const userRef = doc(this.firestore, `users/${currentUser.uid}`);
        return from(getDoc(userRef)).pipe(
          map((snapshot) => {
            const userData = snapshot.data();
            const role = userData?.['role'] || 'user';
            const isMesero = role === 'mesero';

            if (!isMesero) {
              if (role === 'admin') {
                this.router.navigate(['/admin']);
              } else {
                this.redirectService.setRedirectUrl(state.url);
                this.router.navigate(['/login']);
              }
              return false;
            }

            sessionStorage.setItem('loggedIn', 'true');
            sessionStorage.setItem('uid', currentUser.uid);
            return true;
          }),
          catchError((error) => {
            console.error('Error verificando rol mesero:', error);
            this.router.navigate(['/login']);
            return of(false);
          })
        );
      })
    );
  }
}