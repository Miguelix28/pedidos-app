import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatListModule } from '@angular/material/list';
import { ActivatedRoute, Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApiService, OrderPayload } from '../../services/api.service';
import { GoogleAuthService } from '../../services/google.auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatCardModule, MatButtonToggleModule, MatListModule, CommonModule,MatExpansionModule,
    FormsModule,],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css']
})
export class CarritoComponent implements OnInit {
  carrito: any[] = [];
  subtotal: number = 0;
  total: number = 0;
  selectedType: string = ''; // Valor predeterminado
  mostrarConfirmarPedido: boolean = false;
  orderType: string | undefined;
  showDireccion: boolean = false;
  direccion: string = '';
  formSubmitted: boolean = false;
  mensajeAdicional: string | undefined; // Mensaje adicional del usuario
  pedidoConfirmado: boolean = localStorage.getItem('pedidoConfirmado') === 'true';
  metodoPago: string = 'efectivo';
  montoNumerico: number = 0;
  montoDisplay: string = '';
  montoValido: boolean = true;
  montoExcedido: boolean = false;
  nombreCliente: string = '';
  numeroCelular: string = '';
  showName: boolean = false;
  montoInsuficiente: boolean = false;
  isMeseroMode: boolean = false;
  tableNumber: string = '';
  quickTables: number[] = Array.from({ length: 20 }, (_, i) => i + 1);
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private carritoService: CarritoService,
    private apiService: ApiService,
    private googleAuth: GoogleAuthService
  ) {
  }

  ngOnInit() {
    this.isMeseroMode = this.route.snapshot.data['mode'] === 'mesero' || this.router.url.startsWith('/mesero/');
    this.verificarSiPedidoModificado();
    const carritoStorage = sessionStorage.getItem('carrito');
    this.carrito = carritoStorage ? JSON.parse(carritoStorage) : [];
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
    this.iniciarNuevoPedido();
  }

  iniciarNuevoPedido() {
    // Resetear estado de confirmación
    this.pedidoConfirmado = false;
    localStorage.removeItem('pedidoConfirmado');
    localStorage.removeItem('estadoPedidoActual');
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

// Solo permite letras y espacios en el nombre (en tiempo real)
onNombreInput(event: any) {
  let value = event.target.value;
  // Permite letras, tildes, ñ y espacios
  value = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
  event.target.value = value; // Actualiza el input en móviles
  this.nombreCliente = value;
}

filtrarCelular(event: Event) {
  const input = event.target as HTMLInputElement;
  input.value = input.value.replace(/\D/g, '').slice(0, 10);
  this.numeroCelular = input.value;
}

onTableInput(event: Event) {
  const input = event.target as HTMLInputElement;
  input.value = input.value.replace(/\D/g, '').slice(0, 3);
  this.tableNumber = input.value;
}

selectTable(table: number) {
  this.tableNumber = String(table);
}

clearTableSelection() {
  this.tableNumber = '';
}

numeroCelularValido(): boolean {
  return /^\d{10}$/.test(this.numeroCelular?.toString() || '');
}

  private getOrderSourceLabel(): 'Cliente' | 'Mesero' {
    return this.isMeseroMode ? 'Mesero' : 'Cliente';
  }

  async irAPagar() {
    this.formSubmitted = true;
    if (this.pedidoConfirmado) return;
    if (!this.selectedType) {
      return;
    }
    if (this.montoExcedido) return;
    if (!this.nombreCliente || this.nombreCliente.trim().length === 0) {
      return;
    }
    
    if (!this.numeroCelular || this.numeroCelular.toString().length !== 10 || !/^\d{10}$/.test(this.numeroCelular.toString())) {
      return;
    }

    if (this.isMeseroMode && this.selectedType === 'restaurant' && !this.tableNumber.trim()) {
      return;
    }

    const orderType = this.carritoService.getOrderType();
  
    // Forzar validaciones antes de salir
    this.formSubmitted = true;
  
    if (orderType === 'delivery') {
      this.validateDireccion();     // actualiza estado de dirección
      this.validarMonto();          // actualiza montoValido
  
      if (
        !this.direccion || 
        !this.metodoPago ||
        (this.metodoPago === 'efectivo' && !this.montoValido)
      ) {
        return;
      }
    }
  
    // 🟢 Si todo está bien, continúa con el mensaje y redirección
    this.pedidoConfirmado = true;
    localStorage.setItem('pedidoConfirmado', 'true');
    localStorage.removeItem('splashYaMostrado');
  
    // Construir mensaje
    let mensaje = "📦 *Resumen del Pedido* 📦\n\n";
  
    this.carrito.forEach(item => {
      if (item.category === 'Salchipapa') {
        mensaje += `*${item.cantidad}x ${item.category} ${item.name}* (${item.cantidadPersonas} persona${item.cantidadPersonas > 1 ? 's' : ''}) - $${(item.price * item.cantidad).toLocaleString()}\n`;
      } else if (item.category === 'Arma tu salchi') {
      mensaje += `* X${item.cantidad} ${item.category}* (${item.cantidadPersonas} persona${item.cantidadPersonas > 1 ? 's' : ''}) - $${(item.price * item.cantidad).toLocaleString()}\n`;
      } else {
        mensaje += `*${item.cantidad}x ${item.category} ${item.name}* - $${(item.price * item.cantidad).toLocaleString()}\n`;
      }
  
      if (item.customization?.additions?.length > 0) {
        mensaje += `🟢 Adiciones:\n`;
        item.customization.additions.forEach((add: any) => {
          mensaje += `  ${add.nombre} (x${add.cantidad})\n`;
        });
      }
      if (item.customization?.exclusions?.length > 0) {
        mensaje += `🔴 Sin:\n`;
        item.customization.exclusions.forEach((exc: any) => {
          mensaje += `  ${exc}\n`;
        });
      }
      if (item.customization?.complements?.length > 0) {
        mensaje += `🔵 Complementos:\n`;
        item.customization.complements.forEach((add: any) => {
          mensaje += `  ${add.nombre} (x${add.cantidad})\n`;
        });
      }
  
      mensaje += "\n";
    });
  
    mensaje += `💰 *Subtotal*: $${this.subtotal.toLocaleString()}\n`;
    mensaje += `🎉 *${this.selectedType === 'delivery' ? 'Total sin domicilio' : 'Total'}*: $${this.total.toLocaleString()}\n\n`;
  
    if (orderType === 'delivery') {
      mensaje += `🛵 *Tipo de Pedido*: Entrega a Domicilio\n`;
      mensaje += `📍 *Dirección*: ${this.direccion}\n`;
      mensaje += `💳 *Método de Pago*: ${this.metodoPago}\n`;
  
      if (this.metodoPago === 'efectivo') {
        mensaje += `💵 *Pagas con*: ${this.montoDisplay}\n`;
      }
    } else if (orderType === 'takeaway') {
      mensaje += `🥡 *Tipo de Pedido*: Para llevar\n`;
    } else {
      mensaje += `🍽️ *Tipo de Pedido*: Para comer en el restaurante\n`;
      if (this.tableNumber.trim()) {
        mensaje += `🪑 *Mesa*: ${this.tableNumber.trim()}\n`;
      }
    }

    mensaje += `🧾 *Origen*: ${this.getOrderSourceLabel()}\n`;
  
    if (this.mensajeAdicional && this.mensajeAdicional.trim()) {
      mensaje += `✉️ *Observaciones del pedido*: ${this.mensajeAdicional}\n`;
    }

    if (this.nombreCliente) {
      mensaje += `🙍 *Cliente*: ${this.nombreCliente}\n`;
    }
    
    if (this.numeroCelular) {
      mensaje += `📞 *Teléfono*: ${this.numeroCelular}\n`;
    }
  
    mensaje += "\n¡Gracias por tu compra! 🙌";
    this.pedidoConfirmado = true;
    localStorage.setItem('pedidoConfirmado', 'true');
    localStorage.removeItem('splashYaMostrado');

    // Enviar el pedido al backend para registro como flujo guest desde menu/carrito.
    const orderPayload: OrderPayload = {
      customerName: this.nombreCliente,
      customerPhone: this.numeroCelular,
      orderType: this.carritoService.getOrderType(),
      source: this.isMeseroMode ? 'mesero' : 'cliente',
      tableNumber: this.selectedType === 'restaurant' ? this.tableNumber.trim() : '',
      deliveryAddress: this.direccion || '',
      paymentMethod: this.metodoPago,
      paymentAmount: Number(this.montoDisplay.replace(/[^0-9]/g, '')) || 0,
      subtotal: this.subtotal,
      total: this.total,
      note: this.mensajeAdicional || '',
      items: this.carrito.map((item: any) => ({
        productId: String(item.id || item._id || ''),
        name: String(item.name || 'Producto sin nombre'),
        category: item.category,
        price: Number(item.price || 0),
        quantity: item.cantidad || 1,
        customization: item.customization || {}
      }))
    };

    try {
      await firstValueFrom(this.apiService.createOrder(orderPayload));
      console.log('Pedido guardado en backend');
    } catch (err) {
      console.error('No se pudo guardar el pedido en backend:', err);
    }

    const numeroDestino = "573163600104";
    // const numeroDestino = "573165345924";
    const urlWhatsApp = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`;

    // Try opening a new tab first; if blocked, fallback to same-tab redirect.
    const popup = window.open(urlWhatsApp, '_blank');
    if (!popup) {
      window.location.href = urlWhatsApp;
    }
  }
  

  volverAlMenu() {
    this.router.navigate([this.isMeseroMode ? '/mesero/menu' : '/menu']);
  }

  setOrderType(type: string) {
    this.selectedType = type;
    this.showName = true;
    if (type === 'delivery') {
      this.showDireccion = true;
      // this.getUbicacion(); 
    } else {
      this.showDireccion = false;
      this.direccion = '';
    }
    if (type !== 'restaurant') {
      this.tableNumber = '';
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

  guardarEstadoPedidoActual() {
    // Guardar información del carrito para comparar más tarde
    const estadoCarrito = this.carrito.map(item => ({
      id: item.id,
      cantidad: item.cantidad,
      customization: JSON.stringify(item.customization || {})
    }));
    
    // Guardar dirección y tipo de pedido
    const datosActuales = {
      carrito: estadoCarrito,
      orderType: this.carritoService.getOrderType(),
      tableNumber: this.tableNumber,
      direccion: this.direccion,
      mensajeAdicional: this.mensajeAdicional
    };
    
    localStorage.setItem('estadoPedidoActual', JSON.stringify(datosActuales));
  }
  
  // Método para verificar si el pedido ha sido modificado
  verificarSiPedidoModificado() {
    // Si no hay un pedido confirmado, no hay nada que verificar
    if (localStorage.getItem('pedidoConfirmado') !== 'true') {
      return false;
    }
    
    // Obtener estado guardado
    const estadoGuardado = JSON.parse(localStorage.getItem('estadoPedidoActual') || '{}');
    
    // Si no hay estado guardado, considerarlo como modificado
    if (!estadoGuardado.carrito) {
      return true;
    }
    
    // Verificar si la cantidad de productos cambió
    if (estadoGuardado.carrito.length !== this.carrito.length) {
      this.reactivarBoton();
      return true;
    }
    
    // Verificar si algún producto cambió (ID, cantidad o personalización)
    const productoModificado = this.carrito.some((item, index) => {
      const itemGuardado = estadoGuardado.carrito[index];
      return (
        item.id !== itemGuardado.id ||
        item.cantidad !== itemGuardado.cantidad ||
        JSON.stringify(item.customization || {}) !== itemGuardado.customization
      );
    });
    
    // Verificar si cambió el tipo de pedido
    const tipoModificado = estadoGuardado.orderType !== this.carritoService.getOrderType();
    const mesaModificada = (estadoGuardado.tableNumber || '') !== this.tableNumber;
    
    // Verificar si cambió la dirección
    const direccionModificada = estadoGuardado.direccion !== this.direccion;
    
    // Verificar si cambió el mensaje adicional
    const mensajeModificado = estadoGuardado.mensajeAdicional !== this.mensajeAdicional;
    
    // Si hubo alguna modificación
    if (productoModificado || tipoModificado || mesaModificada || direccionModificada || mensajeModificado) {
      this.reactivarBoton();
      return true;
    }
    
    return false;
  }
  
  // Método para reactivar el botón
  reactivarBoton() {
    this.pedidoConfirmado = false;
    localStorage.setItem('pedidoConfirmado', 'false');
  }

  formatearMonto(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
  
    if (value) {
      let numericValue = parseInt(value);
      if (numericValue > 10000000) {
        this.montoExcedido = true;
        numericValue = 10000000;
      } else {
        this.montoExcedido = false;
      }
      this.montoDisplay = `$${numericValue.toLocaleString('es-CO')}`;
    } else {
      this.montoDisplay = '';
      this.montoExcedido = false;
    }
  }
  
  
  formatearNumero(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  
validarMonto() { 
  const valorNumerico = Number(this.montoDisplay.replace(/[^0-9]/g, ''));

  this.montoExcedido = valorNumerico > 10000000;
  this.montoInsuficiente = valorNumerico < this.total;

  if (isNaN(valorNumerico) || valorNumerico <= 0 || valorNumerico > 10000000) {
    this.montoValido = false;
    return;
  }

  if (valorNumerico < this.total) {
    this.montoValido = false;
    return;
  }

  this.montoValido = true;
}
}
