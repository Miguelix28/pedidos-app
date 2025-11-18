import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductoService } from '../../services/producto.service';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from "@angular/material/radio";

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, MatExpansionModule,
    MatCheckboxModule,
    MatButtonModule,  MatRadioModule,
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
  sizeSeleccionada: string = 'Personal';
  adicionesSeleccionadas: Record<string, number> = {};
  complementosSeleccionados: Record<string, number> = {};
  titleAddittions: string = 'Adiciones';
  titlePorciones: string = 'Cantidad de personas';
  currentStep: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productoService: ProductoService
  ) {}

  ngOnInit() {
    // Asegura que el scroll funcione correctamente al cargar la página
  setTimeout(() => {
    const container = document.querySelector('.producto-detalle-container');
    if (container) {
      container.scrollTop = 0;
    }
  }, 200);
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId === 'Arma-tu-Salchi!') {
      this.titleAddittions = 'Personaliza tu salchi con adiciones';
      this.titlePorciones = 'Porción de papa + salchicha y salsas';
    } else {
      this.titleAddittions = 'Adiciones';
    }
    if (productId) {
      this.productoService.getProductoById(productId).subscribe(producto => {
        if (!producto) {
          this.router.navigate(['/menu']);
        }
        if (producto.category === 'Salchipapa') {
          this.titlePorciones = 'Cantidad de personas';
        }
        this.producto = producto;
        this.producto.cantidadPersonas = this.producto.cantidadPersonas || 1;
        this.producto.precioUnitario = this.producto.precioUnitario || this.producto.price;
        this.producto.price = this.producto.precioUnitario * this.producto.cantidadPersonas;

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

  // Método para agregar una complementos y contar la cantidad
  agregarComplementos(complements: string) {
    if (!this.complementosSeleccionados[complements]) {
      this.complementosSeleccionados[complements] = 1;
    } else {
      this.complementosSeleccionados[complements]++;
    }
  }

  // Método para disminuir la cantidad de una adición
  disminuirComplementosn(complements: string) {
    if (this.complementosSeleccionados[complements] && this.complementosSeleccionados[complements] > 0) {
      this.complementosSeleccionados[complements]--;
      if (this.complementosSeleccionados[complements] === 0) {
        delete this.complementosSeleccionados[complements]; // Elimina la adición si llega a 0
      }
    }
  }

  // Verifica si un complemento ha sido agregado
  isComplementoAgregado(complements: string): boolean {
    return this.complementosSeleccionados[complements] > 0;
  }

  // Verifica si una exclusión ha sido seleccionada
  isExclusionSeleccionada(exclusion: string): boolean {
    return this.exclusionesSeleccionadas[exclusion] === true;
  }

  // Verifica si una adición ha sido agregada
  isAdicionAgregada(addition: string): boolean {
    return this.adicionesSeleccionadas[addition] > 0;
  }

  agregarCantidadPersonas() {
    const categoria = this.producto?.category;
  
    if (categoria === 'Salchipapa' && this.producto.cantidadPersonas < 3) {
      this.producto.cantidadPersonas++;
    } else if (categoria === 'Arma tu salchi') {
      this.producto.cantidadPersonas++;
    }
  
    this.producto.price = this.producto.precioUnitario * this.producto.cantidadPersonas;
  }
  
  disminuirCantidadPersonas() {
    if (this.producto.cantidadPersonas > 1) {
      this.producto.cantidadPersonas--;
      this.producto.price = this.producto.precioUnitario * this.producto.cantidadPersonas;
    }
  }

  actualizarCantidadPorSize() {
    if (this.sizeSeleccionada.includes('Personal')) {
      this.producto.cantidadPersonas = 1;
    } else if (this.sizeSeleccionada.includes('2')) {
      this.producto.cantidadPersonas = 2;
    } else if (this.sizeSeleccionada.includes('3')) {
      this.producto.cantidadPersonas = 3;
    } else {
      this.producto.cantidadPersonas = 1;
    }
  
    this.producto.price = this.producto.precioUnitario * this.producto.cantidadPersonas;
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

  const complementos = Object.entries(this.complementosSeleccionados)
    .filter(([_, cantidad]) => cantidad > 0)
    .map(([nombre, cantidad]) => {
      const complementsInfo = this.producto.customization.complements.find((a: any) => a.name === nombre);
      return {
        nombre,
        cantidad,
        precioUnitario: complementsInfo?.price || 0,
        subtotal: (complementsInfo?.price || 0) * cantidad
      };
    });

  // Incluye sizeSeleccionada en productoParaAgregar
  const productoParaAgregar = {
    ...this.producto,
    cantidad: this.cantidad,
    customization: {
      exclusions: exclusiones,
      additions: adiciones,
      complements: complementos
    },
    sizeSeleccionada: this.sizeSeleccionada, // Guardar size
    precioTotal: this.getPrecioTotal()
  };

  // Modifica el findIndex para comparar única por posición de tamaño/personas
  const index = carrito.findIndex((p: any) =>
    p.id === this.producto.id &&
    p.sizeSeleccionada === this.sizeSeleccionada && // Añadido: compara el tamaño seleccionado
    JSON.stringify(p.customization.exclusions) === JSON.stringify(exclusiones) &&
    JSON.stringify(p.customization.additions) === JSON.stringify(adiciones) &&
    JSON.stringify(p.customization.complements) === JSON.stringify(complementos)
  );

  if (index !== -1) {
    carrito[index].cantidad += this.cantidad;
    carrito[index].precioTotal += productoParaAgregar.precioTotal;
  } else {
    carrito.push(productoParaAgregar);
  }

  this.iniciarNuevoPedido();
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
    let totalComplementos = 0;
  
    if (this.producto?.customization?.additions) {
      for (const addition of this.producto.customization.additions) {
        const cantidad = this.adicionesSeleccionadas[addition.name] || 0;
        totalAdiciones += addition.price * cantidad;
      }
    }

    if (this.producto?.customization?.complements) {
      for (const complement of this.producto.customization.complements) {
        const cantidad = this.complementosSeleccionados[complement.name] || 0;
        totalComplementos += complement.price * cantidad;
      }
    }
  
    return (precioBase + totalAdiciones + totalComplementos) * this.cantidad; // 👈 Adiciones también se multiplican
  }

  scrollToStep() {
    // Encuentra todos los paneles de expansión
    const panels = document.querySelectorAll('mat-expansion-panel');
    
    // Si hay un panel correspondiente al paso actual
    if (panels[this.currentStep]) {
      // Espera un momento para que se abra el panel antes de hacer scroll
      setTimeout(() => {
        panels[this.currentStep].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        });
      }, 100);
    }
  }
}