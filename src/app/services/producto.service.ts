import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService, Product } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private productosSubject = new BehaviorSubject<Product[]>([]);
  productos$ = this.productosSubject.asObservable();

  private productoSeleccionado = new BehaviorSubject<Product | null>(null);
  producto$ = this.productoSeleccionado.asObservable();

  constructor(private apiService: ApiService) {
    this.cargarProductos();
  }

  private cargarProductos() {
    this.apiService.getProducts().subscribe({
      next: (productos) => this.productosSubject.next(productos),
      error: (err) => {
        console.error('Error cargando productos desde API:', err);
        this.productosSubject.next([]);
      }
    });
  }

  getProductoById(id: string): Observable<Product> {
    return this.apiService.getProductById(id);
  }

  setProductoSeleccionado(producto: Product) {
    this.productoSeleccionado.next(producto);
  }
}
