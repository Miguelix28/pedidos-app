import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  constructor(private firestore: Firestore) {}

  getProducts(): Observable<Product[]> {
    const productsRef = collection(this.firestore, 'products');
    return collectionData(productsRef, { idField: 'id' }) as Observable<Product[]>;
  }

   // 🔹 Nuevo método para obtener categorías
   getCategories(): Observable<Category[]> {
    const categoriesRef = collection(this.firestore, 'categories'); // Asegúrate de que 'categories' sea el nombre correcto en Firestore
    return collectionData(categoriesRef, { idField: 'id' }) as Observable<Category[]>;
  }

  // 🔥 Nuevo método para obtener categorías 🔥
  getProductsByCategory(category: string): Observable<Product[]> {
    const productsRef = collection(this.firestore, 'products');
    const q = query(productsRef, where('category', '==', category));
    return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
  }
}
