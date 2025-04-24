import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductoService } from '../../services/producto.service';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, MatExpansionModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule],
  templateUrl: './producto-detalle.component.html',
  styleUrls: ['./producto-detalle.component.css']
})
export class ProductoDetalleComponent {
  producto: any;
  cantidad = 1;
  mostrarPersonalizacion = false;
  mostrarAdiciones = false;
  exclusionesSeleccionadas: { [key: string]: boolean } = {};
  adicionesSeleccionadas: Record<string, number> = {};
  titleAddittions: string = 'Adiciones';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productoService: ProductoService
  ) {}

  ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId === 'Arma-tu-Salchi!') {
      this.titleAddittions = 'Personaliza tu salchi con adiciones';
    } else {
      this.titleAddittions = 'Adiciones';
    }
    if (productId) {
      this.productoService.getProductoById(productId).subscribe(producto => {
        if (!producto) {
          this.router.navigate(['/menu']);
        }
        this.producto = producto;
      });
    }
  }

  volverAlMenu() {
    this.router.navigate(['/menu']);
  }

  aumentarCantidad() {
    this.cantidad++;
  }

  disminuirCantidad() {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

   // Método para agregar una adición y contar la cantidad
   agregarAdicion(addition: string) {
    if (!this.adicionesSeleccionadas[addition]) {
      this.adicionesSeleccionadas[addition] = 1;
    } else {
      this.adicionesSeleccionadas[addition]++;
    }
  }

  // Método para disminuir la cantidad de una adición
  disminuirAdicion(addition: string) {
    if (this.adicionesSeleccionadas[addition] && this.adicionesSeleccionadas[addition] > 0) {
      this.adicionesSeleccionadas[addition]--;
      if (this.adicionesSeleccionadas[addition] === 0) {
        delete this.adicionesSeleccionadas[addition]; // Elimina la adición si llega a 0
      }
    }
  }


  agregarAlCarrito() {
    let carrito = JSON.parse(sessionStorage.getItem('carrito') || '[]');
  
    const exclusiones = Object.keys(this.exclusionesSeleccionadas).filter(key => this.exclusionesSeleccionadas[key]);
  
    const adiciones = Object.entries(this.adicionesSeleccionadas)
      .filter(([_, cantidad]) => cantidad > 0)
      .map(([nombre, cantidad]) => {
        const additionInfo = this.producto.customization.additions.find((a: any) => a.name === nombre);
        return {
          nombre,
          cantidad,
          precioUnitario: additionInfo?.price || 0,
          subtotal: (additionInfo?.price || 0) * cantidad
        };
      });
  
    const precioTotal = this.getPrecioTotal(); // usamos tu método actual
  
    const productoParaAgregar = {
      ...this.producto,
      cantidad: this.cantidad,
      customization: {
        exclusions: exclusiones,
        additions: adiciones
      },
      precioTotal: this.getPrecioTotal()// << guardamos el precio con adiciones incluidas
    };
  
    const index = carrito.findIndex((p: any) =>
      p.id === this.producto.id &&
      JSON.stringify(p.customization.exclusions) === JSON.stringify(exclusiones) &&
      JSON.stringify(p.customization.additions) === JSON.stringify(adiciones)
    );
  
    if (index !== -1) {
      carrito[index].cantidad += this.cantidad;
      carrito[index].precioTotal += precioTotal;
    } else {
      carrito.push(productoParaAgregar);
    }
    this.iniciarNuevoPedido(); // Reinicia el pedido
    sessionStorage.setItem('carrito', JSON.stringify(carrito));
    this.router.navigate(['/menu']);
  }

  iniciarNuevoPedido() {
    localStorage.removeItem('pedidoConfirmado');
    localStorage.removeItem('estadoPedidoActual');
  }
  

  getPrecioTotal(): number {
    let precioBase = this.producto?.price || 0;
    let totalAdiciones = 0;
  
    if (this.producto?.customization?.additions) {
      for (const addition of this.producto.customization.additions) {
        const cantidad = this.adicionesSeleccionadas[addition.name] || 0;
        totalAdiciones += addition.price * cantidad;
      }
    }
  
    return (precioBase + totalAdiciones) * this.cantidad; // 👈 Adiciones también se multiplican
  }
}
