import { Injectable } from '@angular/core';

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
  constructor() {}

  // Este servicio solo mantiene tipos para compatibilidad con el código existente.
  // Datos de productos y categorías deben venir de ApiService (Mongo) en la app.
}

