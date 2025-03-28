import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private carritoKey = 'carrito';
  private orderTypeKey = 'orderType';
  productosCarrito = signal<any[]>(this.obtenerCarrito()); // Usamos Signal para reactividad
  orderType = signal<string>('restaurant');

  constructor() {
    const savedOrderType = sessionStorage.getItem(this.orderTypeKey);
    if (savedOrderType) {
      this.orderType.set(savedOrderType);
    }
  }

  obtenerCarrito(): any[] {
    const carrito = sessionStorage.getItem(this.carritoKey);
    return carrito ? JSON.parse(carrito) : [];
  }

  agregarAlCarrito(producto: any) {
    let carrito = this.obtenerCarrito();
    const index = carrito.findIndex(item => item.id === producto.id);

    if (index !== -1) {
      carrito[index].cantidad += 1;
    } else {
      producto.cantidad = 1;
      carrito.push(producto);
    }

    sessionStorage.setItem(this.carritoKey, JSON.stringify(carrito));
    this.productosCarrito.set(carrito); // Actualiza el signal
  }

  eliminarProducto(id: string) {
    let carrito = this.obtenerCarrito().filter(item => item.id !== id);
    sessionStorage.setItem(this.carritoKey, JSON.stringify(carrito));
    this.productosCarrito.set(carrito);
  }

  vaciarCarrito() {
    sessionStorage.removeItem(this.carritoKey);
    this.productosCarrito.set([]);
  }

  // New method to set and persist order type
  setOrderType(type: string) {
    this.orderType.set(type);
    sessionStorage.setItem(this.orderTypeKey, type);
  }

  // Method to get the current order type
  getOrderType(): string {
    return this.orderType();
  }
}
