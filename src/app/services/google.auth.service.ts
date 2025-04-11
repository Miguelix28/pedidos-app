import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, setDoc, docData, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, of, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  user$ = this.authUser$.pipe(
    switchMap(user => {
      if (user) {
        return docData(doc(this.firestore, `users/${user.uid}`));
      } else {
        return of(null);
      }
    })
  );

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}

  private get authUser$() {
    return user(this.auth);
  }

  async googleSignIn() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);
      sessionStorage.setItem('loggedIn', 'true');
      if (userCredential.user) {
        const user = userCredential.user;
        // Guardar sesión
        sessionStorage.setItem('loggedIn', 'true');
        sessionStorage.setItem('uid', user.uid);
        sessionStorage.setItem('displayName', user.displayName || '');
        return this.updateUserData(userCredential.user);
      }
      return null;
    } catch (error) {
      console.error("Error en inicio de sesión con Google:", error);
      throw error;
    }
  }

  async signOut() {
    await signOut(this.auth);
    sessionStorage.clear();
    this.router.navigate(['/']);
  }

  private async updateUserData(user: any) {
    if (!user || !user.uid) {
      console.error('Error: User data is invalid');
      return Promise.reject('Invalid user data');
    }
  
    const userRef = doc(this.firestore, `users/${user.uid}`);
  
    // 🔍 Leer el documento actual
    const snapshot = await getDoc(userRef);
    const existingData = snapshot.data();
  
    const data = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      role: existingData?.['role'] || 'user' // ✅ Mantiene el rol si ya existe
    };
  
    return setDoc(userRef, data, { merge: true });
  }

  isAdmin(): Observable<boolean> {
    return this.user$.pipe(
      map(user => user?.['role'] === 'admin')
    );
  }

  isLoggedIn(): boolean {
    return sessionStorage.getItem('loggedIn') === 'true';
  }
}
