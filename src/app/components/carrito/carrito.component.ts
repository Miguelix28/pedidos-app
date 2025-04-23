import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatListModule } from '@angular/material/list';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatCardModule, MatButtonToggleModule, MatListModule, CommonModule,
    FormsModule,],
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
  showDireccion: boolean = false;
  direccion: string = '';
  formSubmitted: boolean = false;
  
  constructor(private router: Router, private carritoService: CarritoService) {
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
    if (!this.validateDireccion()) {
      return; // Detiene la ejecución si la validación falla
    }
    
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
    
    // Tipo de pedido con información de dirección si es delivery
    if (orderType === 'delivery') {
      mensaje += `🛵 *Tipo de Pedido*: Entrega a Domicilio\n`;
      mensaje += `📍 *Dirección*: ${this.direccion}\n`;
    } else if (orderType === 'takeaway') {
      mensaje += `🥡 *Tipo de Pedido*: Para llevar\n`;
    } else {
      mensaje += `🍽️ *Tipo de Pedido*: Para comer en el restaurante\n`;
    }
    
    // Mensaje final
    mensaje += "\n¡Gracias por tu pedido! 🙌";
    
    // Redirigir a WhatsApp con el mensaje
    const numeroDestino = "573165345924"; // Número en formato internacional SIN "+"
    const urlWhatsApp = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`;
    window.location.href = urlWhatsApp;
  }

  volverAlMenu() {
    this.router.navigate(['/menu']);
  }

  setOrderType(type: string) {
    this.selectedType = type;
    if (type === 'delivery') {
      this.showDireccion = true;
      this.getUbicacion(); 
    } else {
      this.showDireccion = false;
      this.direccion = '';
    }
    this.carritoService.setOrderType(type);
  }

  getUbicacion() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          this.reverseGeocode(latitude, longitude); // Convertimos a dirección
        },
        error => {
          console.error('Error obteniendo ubicación:', error);
          // alert('No se pudo obtener tu ubicación');
        }
      );
    } else {
      // alert('Tu navegador no soporta geolocalización.');
    }
  }
  
  reverseGeocode(lat: number, lon: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && data.address) {
          // Extraemos solo calle, número y barrio
          const numero = data.address.house_number || '';
          const calle = data.address.road || data.address.street || '';
          const barrio = data.address.suburb || data.address.neighbourhood || '';
          
          // Formateamos la dirección simplificada
          this.direccion = `${calle} ${numero}, ${barrio}`.trim();
          
          // Si faltan datos, mostramos lo que tengamos
          if (!this.direccion || this.direccion === ', ') {
            this.direccion = `Lat: ${lat}, Lon: ${lon}`;
          }
        } else {
          this.direccion = `Lat: ${lat}, Lon: ${lon}`;
        }
      })
      .catch(error => {
        console.error('Error en reverse geocoding:', error);
        this.direccion = `Lat: ${lat}, Lon: ${lon}`;
      });
  }

  validateDireccion(): boolean {
    if (this.selectedType === 'delivery' && !this.direccion.trim()) {
      this.formSubmitted = true;
      return false;
    }
    return true;
  }
}
