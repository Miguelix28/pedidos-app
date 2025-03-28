import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category, FirebaseService, Product } from '../../services/firebase.service';
import { ProductoService } from '../../services/producto.service';
import { Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatCardModule],
  providers: [FirebaseService], 
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit, AfterViewInit {
  @ViewChild('headerMenu', { static: false }) headerMenu!: ElementRef;
  @ViewChild('productsContainer', { static: false }) productsContainer!: ElementRef;
  products$!: Observable<Product[]>;
  categories$!: Observable<Category[]>;
  selectedCategory: string = 'all';
  selectedType: string = 'restaurant'; // Valor predeterminado
  private firebaseService = inject(FirebaseService);
  private productoService = inject(ProductoService);
  private carritoService = inject(CarritoService);
  private router = inject(Router);
  cantidadCarrito: any;
  carrito: any[] = [];
  total: number = 0;
  // Categoría seleccionada
  // selectedCategory: any = null;

  ngAfterViewInit(): void {
    // this.adjustProductsContainerMargin();

    if (this.headerMenu) {
      const resizeObserver = new ResizeObserver(() => {
        this.setHeaderHeightVariable();
      });
      resizeObserver.observe(this.headerMenu.nativeElement);
    }
  }

  ngOnInit() {
    this.selectedType = this.carritoService.getOrderType();
    this.loadAllProducts();
    this.loadCategories();
    this.actualizarCantidadCarrito();
    this.actualizarCarrito();
    console.log('Carrito cargado:', this.carrito); // Verifica en la consola

    setTimeout(() => {
      this.setHeaderHeightVariable();
    });
  }

  // adjustProductsContainerMargin(): void {
  //   if (this.headerMenu && this.productsContainer) {
  //     const headerHeight = this.headerMenu.nativeElement.offsetHeight;
  //     this.productsContainer.nativeElement.style.marginTop = `${headerHeight + 60}px`; // Añade un margen adicional de 20px
  //   }
  // }
 
  setHeaderHeightVariable() {
    if (this.headerMenu && this.productsContainer) {
      const headerHeight = this.headerMenu.nativeElement.offsetHeight;
      
      // Establece la variable CSS para la altura del encabezado
      document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
  }

  // Método para seleccionar una categoría
  selectCategory(category: any): void {
    this.selectedCategory = category;
  }

  loadAllProducts() {
    this.products$ = this.firebaseService.getProducts();
  }

  loadCategories() {
    this.categories$ = this.firebaseService.getCategories();
  }

  setOrderType(type: string) {
    this.selectedType = type;
    this.carritoService.setOrderType(type);
  }

  verDetalles(producto: any) {
    this.productoService.setProductoSeleccionado(producto); // Guardamos el producto seleccionado
    this.router.navigate(['/producto', producto.id]);
  }

  actualizarCantidadCarrito() {
    const carrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
    this.cantidadCarrito = carrito.reduce((acc: any, item: { cantidad: any; }) => acc + item.cantidad, 0);
  }

  actualizarCarrito() {
    const carritoStorage = sessionStorage.getItem('carrito');
    if (carritoStorage) {
      this.carrito = JSON.parse(carritoStorage);
    } else {
      this.carrito = [];
    }
  
    // Calcula el total del carrito teniendo en cuenta la cantidad de cada producto
    this.total = this.carrito.reduce((acc, item) => acc + (item.price * item.cantidad), 0);
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
    this.products$ = category === 'all' 
      ? this.firebaseService.getProducts() 
      : this.firebaseService.getProductsByCategory(category);
  }

  // Método para añadir un producto al carrito
  addToCart(product: Product) {
    // Busca si el producto ya está en el carrito
    const existingProduct = this.carrito.find(item => item.id === product.id);

    if (existingProduct) {
      // Si el producto ya está en el carrito, incrementa la cantidad
      existingProduct.cantidad += 1;
    } else {
      // Si el producto no está en el carrito, añádelo con cantidad 1
      this.carrito.push({ ...product, cantidad: 1 });
    }

    // Actualiza el carrito en el sessionStorage
    sessionStorage.setItem('carrito', JSON.stringify(this.carrito));

    // Actualiza la cantidad y el total del carrito
    this.actualizarCantidadCarrito();
    this.actualizarCarrito();
  }

  // Método para eliminar un producto del carrito
  removeFromCart(index: number) {
    this.carrito.splice(index, 1); // Elimina el producto del carrito
    sessionStorage.setItem('carrito', JSON.stringify(this.carrito)); // Actualiza el sessionStorage
    this.actualizarCantidadCarrito(); // Actualiza la cantidad
    this.actualizarCarrito(); // Actualiza el total
  }

  // Método para modificar la cantidad de un producto en el carrito
  updateQuantity(index: number, cantidad: number) {
    if (cantidad < 1) {
      // Si la cantidad es menor que 1, elimina el producto del carrito
      this.removeFromCart(index);
    } else {
      // Actualiza la cantidad del producto
      this.carrito[index].cantidad = cantidad;
      sessionStorage.setItem('carrito', JSON.stringify(this.carrito)); // Actualiza el sessionStorage
      this.actualizarCarrito(); // Actualiza el total
    }
  }


  irAlCarrito() {
    this.router.navigate(['/carrito']); // Ajusta la ruta según tu configuración de rutas
  }
}
