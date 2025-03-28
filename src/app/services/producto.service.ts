import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Firestore, collection, collectionData, doc, docData } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private productosSubject = new BehaviorSubject<any[]>([]);
  productos$ = this.productosSubject.asObservable();

  private productoSeleccionado = new BehaviorSubject<any>(null);
  producto$ = this.productoSeleccionado.asObservable();

  constructor(private firestore: Firestore) {
    this.cargarProductos();
  }

  private cargarProductos() {
    const productosRef = collection(this.firestore, 'products'); // 🔥 Cambia 'productos' por el nombre real de tu colección en Firebase
    collectionData(productosRef, { idField: 'id' }).subscribe((productos) => {
      this.productosSubject.next(productos);
    });
  }

  getProductoById(id: string): Observable<any | null> {
    const productoRef = doc(this.firestore, `products/${id}`);
    return docData(productoRef, { idField: 'id' });
  }

  setProductoSeleccionado(producto: any) {
    this.productoSeleccionado.next(producto);
  }
}
