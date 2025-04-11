import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatListModule } from '@angular/material/list';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatCardModule, MatButtonToggleModule, MatListModule],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css']
})
export class CarritoComponent implements OnInit {
  carrito: any[] = [];
  subtotal: number = 0;
  total: number = 0;
  selectedType: string = 'restaurant'; // Valor predeterminado
  mostrarConfirmarPedido: boolean = false;
  orderType: string | undefined;
  
  constructor(private router: Router, private carritoService: CarritoService) {
    this.selectedType = this.carritoService.getOrderType();
  }

  ngOnInit() {
    const carritoStorage = sessionStorage.getItem('carrito');
    this.carrito = carritoStorage ? JSON.parse(carritoStorage) : [];
    console.log('Carrito cargado:', this.carrito); // Verifica en la consola
    this.calcularTotales();
    if (this.carrito.length > 0) {
      this.mostrarConfirmarPedido = true;
    }
  }

  // Método para calcular el subtotal y el total
  calcularTotales() {
    this.subtotal = this.carrito.reduce((acc, item) => acc + (item.precioTotal || 0), 0);
    this.total = this.subtotal;
  }

  modificarCantidad(index: number, cantidad: number) {
    if (cantidad <= 0) {
      this.carrito.splice(index, 1);
    } else {
      const item = this.carrito[index];
      item.cantidad = cantidad;
  
      // 🔁 Recalcular precio total con adiciones
      const precioBase = item.price;
      let totalAdiciones = 0;
  
      if (item.customization?.additions) {
        for (const addition of item.customization.additions) {
          totalAdiciones += (addition.precioUnitario || 0) * (addition.cantidad || 0);
        }
      }
  
      item.precioTotal = (precioBase + totalAdiciones) * cantidad;
    }
  
    this.actualizarCarrito();
  }

  eliminarProducto(index: number) {
    this.carrito.splice(index, 1);
    this.actualizarCarrito();
  }

  actualizarCarrito() {
    sessionStorage.setItem('carrito', JSON.stringify(this.carrito));
    this.calcularTotales();
  }

  vaciarCarrito() {
    this.carrito = [];
    sessionStorage.removeItem('carrito');
    this.mostrarConfirmarPedido = false;
    this.calcularTotales();
  }

  irAPagar() {
    // Use the order type from the CarritoService
    const orderType = this.carritoService.getOrderType();
  
    // Construir el mensaje del pedido con formato más amigable
    let mensaje = "📦 *Resumen del Pedido* 📦\n\n";
    
    // Agregar productos y cantidades con más detalle
    this.carrito.forEach(item => {
      // Línea principal del producto
      mensaje += `*${item.cantidad}x ${item.name}* - $${(item.price * item.cantidad).toLocaleString()}\n`;
    
      // Manejar adiciones de manera más detallada
      if (item.customization?.additions?.length > 0) {
        const adicionesTexto = item.customization.additions.map((add: any) => {
          return `${add.nombre} (x${add.cantidad})`;
        }).join(', ');
        mensaje += `  🟢 Adiciones: ${adicionesTexto}\n`;
      }
    
      // Manejar exclusiones de manera más detallada
      if (item.customization?.exclusions && item.customization.exclusions.length > 0) {
        mensaje += `  🔴 Sin: ${item.customization.exclusions.join(', ')}\n`;
      }
    
      // Separador entre productos
      mensaje += "\n";
    });
    
    // Desglose de totales con emojis y formato
    mensaje += `💰 *Subtotal*: $${this.subtotal.toLocaleString()}\n`;
    mensaje += `🎉 *Total*: $${this.total.toLocaleString()}\n\n`;
    
    // Tipo de pedido con más claridad
    const orderTypeMessage = orderType === 'takeaway' 
      ? '🛵 Entrega a Domicilio' 
      : '🍽️ Para comer en el restaurante';
    
    mensaje += `📍 *Tipo de Pedido*: ${orderTypeMessage}\n`;
    
    // Mensaje final
    mensaje += "¡Gracias por tu pedido! 🙌";
    
    // Redirigir a WhatsApp con el mensaje
  const numeroDestino = "573165345924"; // Número en formato internacional SIN "+", ejemplo: México (+52) → "521234567890"
  const urlWhatsApp = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`;
    window.location.href = urlWhatsApp;
  }

  volverAlMenu() {
    this.router.navigate(['/menu']);
  }

  setOrderType(type: string) {
    this.selectedType = type;
    this.carritoService.setOrderType(type);
  }
}
