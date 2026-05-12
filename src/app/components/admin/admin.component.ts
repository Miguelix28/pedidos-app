import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { EditProductDialog } from '../dialogs/edit-product-dialog.component';
import { EditCategoryDialog } from '../dialogs/edit-category-dialog.component';
import { ConfirmDeleteDialog } from '../dialogs/confirm-delete-dialog.component';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../services/google.auth.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { AlertService } from '../../services/alert.service';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  customization?: {
    exclusions?: string[];
    additions?: {
      name: string;
      price: number;
    }[];
  };
}

interface AdminCategory {
  id?: string;
  _id?: string;
  name: string;
  slug?: string;
  icon?: string;
}

interface AdminOrderItem {
  productId: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
  customization?: {
    exclusions?: string[];
    additions?: { name?: string; nombre?: string; price?: number; precioUnitario?: number; cantidad?: number }[];
    complements?: { name?: string; nombre?: string; price?: number; precioUnitario?: number; cantidad?: number }[];
    size?: string[];
  };
}

interface AdminOrder {
  _id: string;
  userId?: string;
  userEmail?: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  source?: string;
  tableNumber?: string;
  mesa?: string;
  table?: string;
  deliveryAddress?: string;
  paymentMethod: string;
  subtotal: number;
  total: number;
  note?: string;
  status: string;
  createdAt: string;
  items: AdminOrderItem[];
}

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
type AlertLevel = 'success' | 'error' | 'warning' | 'info';

interface HorarioDia {
  abierto: boolean;
  inicio: number; // hora en formato 24h
  fin: number;
}
interface Horario {
  [dia: string]: HorarioDia;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatTableModule,
    MatButtonModule, 
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatExpansionModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  private readonly orderColumnWidthStorageKey = 'admin-order-column-widths';
  private readonly alertTypeByMessage: Record<string, AlertLevel> = {
    'No se pudieron cargar las ordenes': 'error',
    'No hay ordenes para exportar en ese periodo': 'warning',
    'No se pudo exportar el archivo': 'error',
    'No se encontro el ID de la orden': 'warning',
    'No se pudo actualizar el estado': 'error',
    'Telefono invalido para WhatsApp': 'warning',
    'Tu sesion expiro. Inicia sesion de nuevo.': 'error',
    'No se pudieron cargar los productos': 'error',
    'Producto añadido correctamente': 'success',
    'Error al añadir el producto': 'error',
    'Producto actualizado correctamente': 'success',
    'Error al actualizar el producto': 'error',
    'Producto eliminado correctamente': 'success',
    'Error al eliminar el producto': 'error',
    'El nombre de la categoria no es valido': 'warning',
    'Esa categoria ya existe': 'warning',
    'Categoria creada correctamente': 'success',
    'No se pudo crear la categoria': 'error',
    'No se encontro ID de categoria': 'warning',
    'Ya existe una categoria con ese nombre': 'warning',
    'Categoria actualizada': 'success',
    'No se pudo actualizar la categoria': 'error',
    'Categoria eliminada': 'success',
    'No se pudo eliminar la categoria': 'error',
    'Error al cerrar sesión': 'error',
    'No autorizado para subir imagen': 'warning',
    'Imagen subida correctamente. Ahora pega la URL en el formulario.': 'success',
    'Subida completada pero no se obtuvo URL': 'warning',
    'Error subiendo imagen': 'error',
    'Debes completar nombre, correo y clave': 'warning',
    'La clave debe tener al menos 6 caracteres': 'warning',
    'Usuario mesero creado correctamente': 'success',
    'No se pudo crear el usuario mesero': 'error',
    'No autorizado para crear usuarios': 'error',
    'El correo ya existe': 'warning',
    'El backend no tiene la ruta de usuarios. Reinicia el API local.': 'warning',
  };

  dataSource = new MatTableDataSource<Product>([]);
  categories: AdminCategory[] = [];
  orders: AdminOrder[] = [];
  ordersLoading = false;
  ordersPeriod: 'day' | 'month' | 'year' = 'day';
  ordersDate = this.getTodayDateString();
  ordersMonth = this.getCurrentMonthString();
  ordersYear = new Date().getFullYear();
  ordersCount = 0;
  ordersTotalAmount = 0;
  displayedOrderColumns: string[] = [
    'fecha',
    'cliente',
    'telefono',
    'tipo',
    'pago',
    'items',
    'total',
    'estado',
    'accion'
  ];
  displayedColumns: string[] = [
    'image',
    'name',
    'price',
    'category',
    'customization',
    'actions'
  ];
  isLoading = true;
  searchControl = new FormControl('');
  showMeseroForm = false;
  meseroName = '';
  meseroEmail = '';
  meseroPassword = '';
  creatingMesero = false;
  showComandaPreview = false;
  comandaPreviewText = '';
  comandaPreviewRaw = '';
  comandaPreviewFileName = '';
  orderColumnWidths: Record<string, number> = {
    fecha: 150,
    cliente: 180,
    telefono: 130,
    mesa: 100,
    origen: 100,
    tipo: 130,
    pago: 120,
    items: 72,
    total: 120,
    estado: 120,
    accion: 180,
  };
  private orderColumnResizeState: {
    column: string;
    startX: number;
    startWidth: number;
  } | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private apiService: ApiService,
    public dialog: MatDialog,
    private router: Router,
    private authService: GoogleAuthService,
    private alertService: AlertService,
  ) {
  }

  ngOnInit(): Promise<void> | void {
    this.loadOrderColumnWidths();

    return Promise.all([this.loadProducts(), this.loadCategories(), this.loadOrders()]).then(() => {
      this.searchControl.valueChanges
        .pipe(debounceTime(300))
        .subscribe(value => {
          this.dataSource.filter = (value || '').trim().toLowerCase();
        });
    });
  }

  private showAlert(
    message: string,
    _action: string = 'Cerrar',
    options: { duration?: number } = {}
  ) {
    const duration = options.duration ?? 3000;
    const type = this.getAlertType(message);

    if (type === 'success') {
      this.alertService.success(message, duration);
      return;
    }

    if (type === 'error') {
      this.alertService.error(message, duration);
      return;
    }

    if (type === 'warning') {
      this.alertService.warning(message, duration);
      return;
    }

    this.alertService.info(message, duration);
  }

  private getAlertType(message: string): AlertLevel {
    if (!message) {
      return 'info';
    }

    const mapped = this.alertTypeByMessage[message];
    if (mapped) {
      return mapped;
    }

    if (message.startsWith('Estado actualizado:')) {
      return 'success';
    }

    if (message.startsWith('Exportacion lista:')) {
      return 'success';
    }

    if (message.startsWith('No se puede eliminar.')) {
      return 'warning';
    }

    return 'info';
  }

  onOrdersPeriodChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as 'day' | 'month' | 'year';
    this.ordersPeriod = value;
  }

  onOrdersDateChange(event: Event) {
    this.ordersDate = (event.target as HTMLInputElement).value;
  }

  onOrdersMonthChange(event: Event) {
    this.ordersMonth = (event.target as HTMLInputElement).value;
  }

  onOrdersYearChange(event: Event) {
    const parsed = Number((event.target as HTMLInputElement).value);
    this.ordersYear = Number.isFinite(parsed) ? parsed : this.ordersYear;
  }

  async loadOrders() {
    try {
      this.ordersLoading = true;

      const filters = this.buildOrderFilters(this.ordersPeriod);
      const response = await firstValueFrom(this.apiService.getAdminOrders(filters));
      this.orders = (response?.orders || []) as AdminOrder[];
      this.ordersCount = Number(response?.count || this.orders.length || 0);
      this.ordersTotalAmount = Number(response?.totalAmount || 0);
    } catch (error) {
      console.error('Error cargando ordenes:', error);
      this.showAlert('No se pudieron cargar las ordenes', 'Cerrar', { duration: 3000 });
      this.orders = [];
      this.ordersCount = 0;
      this.ordersTotalAmount = 0;
    } finally {
      this.ordersLoading = false;
    }
  }

  async exportOrders(period: 'day' | 'month' | 'year') {
    try {
      const filters = this.buildOrderFilters(period);
      const response = await firstValueFrom(this.apiService.getAdminOrders(filters));
      const exportOrders = (response?.orders || []) as AdminOrder[];

      if (!exportOrders.length) {
        this.showAlert('No hay ordenes para exportar en ese periodo', 'Cerrar', { duration: 3000 });
        return;
      }

      const csv = this.buildOrdersCsv(exportOrders);
      const fileName = `ordenes-${period}-${this.getExportSuffix(period)}.csv`;
      this.downloadCsv(csv, fileName);
      this.showAlert(`Exportacion lista: ${fileName}`, 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error exportando ordenes:', error);
      this.showAlert('No se pudo exportar el archivo', 'Cerrar', { duration: 3000 });
    }
  }

  private buildOrderFilters(period: 'day' | 'month' | 'year') {
    if (period === 'day') {
      return { period, date: this.ordersDate };
    }
    if (period === 'month') {
      return { period, month: this.ordersMonth };
    }
    return { period, year: this.ordersYear };
  }

  private getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private getCurrentMonthString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getExportSuffix(period: 'day' | 'month' | 'year'): string {
    if (period === 'day') return this.ordersDate;
    if (period === 'month') return this.ordersMonth;
    return String(this.ordersYear);
  }

  private buildOrdersCsv(orders: AdminOrder[]): string {
    const delimiter = ';';
    const header = [
      'ID Pedido',
      'Fecha',
      'Cliente',
      'Telefono',
      'Mesa',
      'Origen',
      'Tipo',
      'Pago',
      'Items',
      'Subtotal',
      'Total',
      'Estado',
      'Detalle Productos'
    ];

    const rows = orders.map((order) => {
      const detail = (order.items || [])
        .map((item) => `${item.quantity}x ${item.name} (${item.category || 'sin-categoria'})`) 
        .join(' | ');

      return [
        order._id,
        this.formatDate(order.createdAt),
        order.customerName,
        order.customerPhone,
        this.getOrderTableLabel(order),
        this.getOrderSourceLabel(order),
        order.orderType,
        order.paymentMethod,
        String((order.items || []).length),
        String(order.subtotal || 0),
        String(order.total || 0),
        order.status || 'pending',
        detail,
      ];
    });

    const csvBody = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(delimiter))
      .join('\n');

    // Help Excel (especially regional settings) detect semicolon-separated UTF-8 CSV.
    return `sep=${delimiter}\n${csvBody}`;
  }

  private downloadCsv(content: string, fileName: string) {
    const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  formatDate(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-CO');
  }

  getOrderTableLabel(order: AdminOrder): string {
    const raw = String(order?.tableNumber || order?.mesa || order?.table || '').trim();
    return raw || '-';
  }

  getOrderSourceLabel(order: AdminOrder): string {
    const explicitSource = String(order?.source || '').toLowerCase();
    if (explicitSource === 'mesero' || explicitSource === 'cliente') {
      return explicitSource === 'mesero' ? 'Mesero' : 'Cliente';
    }

    if (String(order?.userId || '').trim() || String(order?.userEmail || '').trim()) {
      return 'Mesero';
    }

    switch (String(order?.source || '').toLowerCase()) {
      case 'mesero':
        return 'Mesero';
      case 'cliente':
        return 'Cliente';
      default:
        return 'Cliente';
    }
  }

  getOrderStatusLabel(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Recibida';
      case 'preparing':
        return 'En preparacion';
      case 'delivered':
        return 'Entregada';
      case 'cancelled':
        return 'Cancelada';
      case 'pending':
      default:
        return 'Pendiente';
    }
  }

  async updateOrderStatus(order: AdminOrder, status: OrderStatus, sendWhatsapp: boolean = false): Promise<boolean> {
    if (!order?._id) {
      this.showAlert('No se encontro el ID de la orden', 'Cerrar', { duration: 3000 });
      return false;
    }

    try {
      const updated = await firstValueFrom(this.apiService.updateAdminOrderStatus(order._id, status));
      order.status = updated?.status || status;

      if (sendWhatsapp && status === 'preparing') {
        this.notifyOrderPreparing(order);
      }

      this.showAlert(`Estado actualizado: ${this.getOrderStatusLabel(order.status)}`, 'Cerrar', { duration: 2200 });
      return true;
    } catch (error) {
      console.error('Error actualizando estado de la orden:', error);
      this.showAlert('No se pudo actualizar el estado', 'Cerrar', { duration: 3000 });
      return false;
    }
  }

  async markOrderReady(order: AdminOrder) {
    const updated = await this.updateOrderStatus(order, 'delivered');
    if (!updated) {
      return;
    }

    this.notifyOrderReady(order);
  }

  generateOrderComanda(order: AdminOrder) {
    this.comandaPreviewRaw = this.buildOrderComandaTxt(order, 48);
    this.comandaPreviewText = this.buildOrderComandaPreview(order, 48);
    this.comandaPreviewFileName = `comanda-${order._id || 'pedido'}.txt`;
    this.showComandaPreview = true;
  }

  closeComandaPreview() {
    this.showComandaPreview = false;
  }

  copyComandaPreview() {
    const content = this.comandaPreviewRaw || this.comandaPreviewText;
    if (!content) {
      return;
    }

    navigator.clipboard.writeText(content).then(() => {
      this.showAlert('Comanda copiada al portapapeles', 'Cerrar', { duration: 2500 });
    }).catch(() => {
      this.showAlert('No se pudo copiar la comanda', 'Cerrar', { duration: 3000 });
    });
  }

  downloadPreviewTxt() {
    if (!this.comandaPreviewRaw) {
      return;
    }

    this.downloadTxt(this.comandaPreviewRaw, this.comandaPreviewFileName || 'comanda.txt');
    this.showAlert('TXT descargado correctamente', 'Cerrar', { duration: 2500 });
  }

  getOrderColumnWidth(column: string): number {
    return this.orderColumnWidths[column] || 120;
  }

  startOrderColumnResize(column: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.orderColumnResizeState = {
      column,
      startX: event.clientX,
      startWidth: this.getOrderColumnWidth(column),
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp() {
    if (!this.orderColumnResizeState) {
      return;
    }

    this.orderColumnResizeState = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    this.saveOrderColumnWidths();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent) {
    if (!this.orderColumnResizeState) {
      return;
    }

    const delta = event.clientX - this.orderColumnResizeState.startX;
    const nextWidth = Math.max(70, this.orderColumnResizeState.startWidth + delta);
    this.orderColumnWidths = {
      ...this.orderColumnWidths,
      [this.orderColumnResizeState.column]: nextWidth,
    };
  }

  private saveOrderColumnWidths() {
    try {
      localStorage.setItem(this.orderColumnWidthStorageKey, JSON.stringify(this.orderColumnWidths));
    } catch (error) {
      console.error('No se pudieron guardar los anchos de columnas:', error);
    }
  }

  private loadOrderColumnWidths() {
    try {
      const raw = localStorage.getItem(this.orderColumnWidthStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, number>;
      this.orderColumnWidths = {
        ...this.orderColumnWidths,
        ...Object.fromEntries(
          Object.entries(parsed || {}).filter(([, value]) => Number.isFinite(Number(value)))
            .map(([key, value]) => [key, Math.max(70, Number(value))])
        ),
      };
    } catch (error) {
      console.error('No se pudieron cargar los anchos de columnas:', error);
    }
  }

  private buildOrderComandaPreview(order: AdminOrder, columns: number = 48): string {
    const separator = '-'.repeat(columns);
    const lines: string[] = [];

    lines.push(this.centerText('COMANDA', columns));
    lines.push(separator);
    lines.push(this.wrapLine(`Pedido: ${order._id || ''}`, columns));
    lines.push(this.wrapLine(`Fecha: ${this.formatDate(order.createdAt)}`, columns));
    lines.push(this.wrapLine(`Cliente: ${order.customerName || ''}`, columns));
    lines.push(this.wrapLine(`Telefono: ${order.customerPhone || ''}`, columns));
    lines.push(this.wrapLine(`Mesa: ${this.getOrderTableLabel(order)}`, columns));
    lines.push(this.wrapLine(`Origen: ${this.getOrderSourceLabel(order)}`, columns));
    lines.push(this.wrapLine(`Tipo: ${this.getOrderTypeLabel(order.orderType)}`, columns));
    lines.push(this.wrapLine(`Pago: ${order.paymentMethod || ''}`, columns));
    if (order.deliveryAddress) {
      lines.push(this.wrapLine(`Direccion: ${order.deliveryAddress}`, columns));
    }
    lines.push(separator);
    lines.push('PRODUCTOS');

    (order.items || []).forEach((item) => {
      const itemTitle = `${item.quantity}x ${item.name || 'Producto'}`;
      lines.push(this.wrapLine(itemTitle, columns));
      lines.push(this.wrapLine(`  ${item.category || 'Sin categoria'} - ${this.formatMoney((item.price || 0) * (item.quantity || 1))}`, columns));

      const customization = this.buildOrderCustomizationPreviewLines(item, columns);
      if (customization.length) {
        lines.push(...customization);
      }

      lines.push('');
    });

    lines.push(separator);
    lines.push(this.wrapLine(`Subtotal: ${this.formatMoney(order.subtotal || 0)}`, columns));
    lines.push(this.wrapLine(`Total: ${this.formatMoney(order.total || 0)}`, columns));
    lines.push(this.wrapLine(`Estado: ${this.getOrderStatusLabel(order.status || 'pending')}`, columns));
    if (order.note) {
      lines.push(separator);
      lines.push('OBSERVACIONES');
      lines.push(this.wrapLine(order.note, columns));
    }
    lines.push(separator);
    lines.push(this.centerText('Gracias', columns));

    return lines.filter(Boolean).join('\n');
  }

  private buildOrderCustomizationPreviewLines(item: AdminOrderItem, columns: number): string[] {
    const lines: string[] = [];
    const customization = item.customization || {};

    if (customization.size?.length) {
      lines.push(this.wrapLine(`  Tamano: ${customization.size.join(', ')}`, columns));
    }

    if (customization.exclusions?.length) {
      lines.push(this.wrapLine(`  Sin: ${customization.exclusions.join(', ')}`, columns));
    }

    if (customization.additions?.length) {
      const additions = customization.additions
        .map((addition) => `${addition.name || addition.nombre || 'Adicion'}${this.formatAdditionQuantity(addition)} x ${this.formatMoney(Number(addition.price ?? addition.precioUnitario ?? 0))}`)
        .join(' | ');
      lines.push(this.wrapLine(`  Adiciones: ${additions}`, columns));
    }

    if (customization.complements?.length) {
      const complements = customization.complements
        .map((complement) => `${complement.name || complement.nombre || 'Complemento'}${this.formatAdditionQuantity(complement)} x ${this.formatMoney(Number(complement.price ?? complement.precioUnitario ?? 0))}`)
        .join(' | ');
      lines.push(this.wrapLine(`  Complementos: ${complements}`, columns));
    }

    return lines;
  }

  private buildOrderComandaTxt(order: AdminOrder, columns: number = 48): string {
    const separator = '-'.repeat(columns);
    const lines: string[] = [];

    // ESC @ = initialize printer, GS V 0 = full cut on many Epson-compatible printers.
    lines.push('\x1B@');
    lines.push(this.centerText('COMANDA', columns));
    lines.push(separator);
    lines.push(this.wrapLine(`Pedido: ${order._id || ''}`, columns));
    lines.push(this.wrapLine(`Fecha: ${this.formatDate(order.createdAt)}`, columns));
    lines.push(this.wrapLine(`Cliente: ${order.customerName || ''}`, columns));
    lines.push(this.wrapLine(`Telefono: ${order.customerPhone || ''}`, columns));
    lines.push(this.wrapLine(`Mesa: ${this.getOrderTableLabel(order)}`, columns));
    lines.push(this.wrapLine(`Origen: ${this.getOrderSourceLabel(order)}`, columns));
    lines.push(this.wrapLine(`Tipo: ${this.getOrderTypeLabel(order.orderType)}`, columns));
    lines.push(this.wrapLine(`Pago: ${order.paymentMethod || ''}`, columns));
    if (order.deliveryAddress) {
      lines.push(this.wrapLine(`Direccion: ${order.deliveryAddress}`, columns));
    }
    lines.push(separator);
    lines.push(this.boldText('PRODUCTOS'));

    (order.items || []).forEach((item) => {
      const itemTitle = `${item.quantity}x ${item.name || 'Producto'}`;
      lines.push(this.wrapLine(itemTitle, columns));
      lines.push(this.wrapLine(`  ${item.category || 'Sin categoria'} - ${this.formatMoney((item.price || 0) * (item.quantity || 1))}`, columns));

      const customization = this.buildOrderCustomizationLines(item, columns);
      if (customization.length) {
        lines.push(...customization);
      }

      lines.push('');
    });

    lines.push(separator);
    lines.push(this.wrapLine(`Subtotal: ${this.formatMoney(order.subtotal || 0)}`, columns));
    lines.push(this.wrapLine(`Total: ${this.formatMoney(order.total || 0)}`, columns));
    lines.push(this.wrapLine(`Estado: ${this.getOrderStatusLabel(order.status || 'pending')}`, columns));
    if (order.note) {
      lines.push(separator);
      lines.push(this.boldText('OBSERVACIONES'));
      lines.push(this.wrapLine(order.note, columns));
    }
    lines.push(separator);
    lines.push(this.centerText('Gracias', columns));
    lines.push('\x1DV\x00');

    return lines.join('\n');
  }

  private buildOrderCustomizationLines(item: AdminOrderItem, columns: number): string[] {
    const lines: string[] = [];
    const customization = item.customization || {};

    if (customization.size?.length) {
      lines.push(this.wrapLine(`  Tamano: ${customization.size.join(', ')}`, columns));
    }

    if (customization.exclusions?.length) {
      lines.push(this.wrapLine(`  Sin: ${customization.exclusions.join(', ')}`, columns));
    }

    if (customization.additions?.length) {
      const additions = customization.additions
        .map((addition) => `${addition.name || addition.nombre || 'Adicion'}${this.formatAdditionQuantity(addition)} x ${this.formatMoney(Number(addition.price ?? addition.precioUnitario ?? 0))}`)
        .join(' | ');
      lines.push(this.wrapLine(`  Adiciones: ${additions}`, columns));
    }

    if (customization.complements?.length) {
      const complements = customization.complements
        .map((complement) => `${complement.name || complement.nombre || 'Complemento'}${this.formatAdditionQuantity(complement)} x ${this.formatMoney(Number(complement.price ?? complement.precioUnitario ?? 0))}`)
        .join(' | ');
      lines.push(this.wrapLine(`  Complementos: ${complements}`, columns));
    }

    return lines;
  }

  private downloadTxt(content: string, fileName: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  getOrderTypeLabel(orderType: string): string {
    switch ((orderType || '').toLowerCase()) {
      case 'restaurant': return 'Restaurante';
      case 'takeaway': return 'Para llevar';
      case 'delivery': return 'Domicilio';
      default: return orderType || 'N/A';
    }
  }

  private boldText(text: string): string {
    return `\x1BE\x01${text}\x1BE\x00`;
  }

  private centerText(text: string, columns: number): string {
    const value = String(text || '').trim();
    const padding = Math.max(0, Math.floor((columns - value.length) / 2));
    return `${' '.repeat(padding)}${value}`;
  }

  private wrapLine(text: string, columns: number): string {
    const value = String(text || '').trim();
    if (!value) return '';

    const words = value.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > columns) {
        if (current) {
          lines.push(current);
        }
        current = word;
      } else {
        current = next;
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines.join('\n');
  }

  private buildItemSpecs(item: AdminOrderItem): string {
    const lines: string[] = [];
    const customization = item.customization || {};

    if (customization.size?.length) {
      lines.push(`Tamaño: ${customization.size.join(', ')}`);
    }

    if (customization.exclusions?.length) {
      lines.push(`Sin: ${customization.exclusions.join(', ')}`);
    }

    if (customization.additions?.length) {
      const additions = customization.additions
        .map((addition) => `${addition.name || addition.nombre || 'Adicion'}${this.formatAdditionQuantity(addition)} (${this.formatMoney(Number(addition.price ?? addition.precioUnitario ?? 0))})`)
        .join(', ');
      lines.push(`Adiciones: ${additions}`);
    }

    if (customization.complements?.length) {
      const complements = customization.complements
        .map((complement) => `${complement.name || complement.nombre || 'Complemento'}${this.formatAdditionQuantity(complement)} (${this.formatMoney(Number(complement.price ?? complement.precioUnitario ?? 0))})`)
        .join(', ');
      lines.push(`Complementos: ${complements}`);
    }

    return lines.map((line) => this.escapeHtml(line)).join('<br />');
  }

  private formatAdditionQuantity(addition: { cantidad?: number }): string {
    const quantity = Number(addition?.cantidad || 0);
    return quantity > 1 ? ` x${quantity}` : '';
  }

  private formatMoney(value: number): string {
    return Number(value || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  notifyOrderPreparing(order: AdminOrder) {
    const phone = this.normalizeWhatsappPhone(order.customerPhone);
    if (!phone) {
      this.showAlert('Telefono invalido para WhatsApp', 'Cerrar', { duration: 3000 });
      return;
    }

    const firstName = (order.customerName || 'cliente').trim().split(' ')[0] || 'cliente';
    const orderRef = (order._id || '').slice(-6).toUpperCase();
    const message = `Hola ${firstName}, tu pedido ${orderRef ? `#${orderRef}` : ''} ya esta en preparacion. Te avisamos cuando este listo.`.trim();
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  notifyOrderReady(order: AdminOrder) {
    const phone = this.normalizeWhatsappPhone(order.customerPhone);
    if (!phone) {
      this.showAlert('Telefono invalido para WhatsApp', 'Cerrar', { duration: 3000 });
      return;
    }

    const message = this.buildOrderReadyMessage(order);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  private buildOrderReadyMessage(order: AdminOrder): string {
    const firstName = (order.customerName || 'cliente').trim().split(' ')[0] || 'cliente';
    const orderRef = (order._id || '').slice(-6).toUpperCase();
    const greeting = `Hola ${firstName}`;

    if (order.orderType === 'takeaway') {
      return `${greeting}, tu pedido ${orderRef ? `#${orderRef}` : ''} esta listo para recoger. Te esperamos.`.trim();
    }

    if (order.orderType === 'delivery') {
      const hasAddress = !!(order.deliveryAddress || '').trim();
      const addressText = hasAddress ? ` rumbo a ${order.deliveryAddress}` : ' rumbo a tu domicilio';
      return `${greeting}, tu pedido ${orderRef ? `#${orderRef}` : ''} ya salio${addressText}. Gracias por tu compra.`.trim();
    }

    return `${greeting}, tu pedido ${orderRef ? `#${orderRef}` : ''} esta listo para servir en el restaurante.`.trim();
  }

  private normalizeWhatsappPhone(rawPhone: string): string {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (!digits) return '';

    if (digits.length === 10) {
      return `57${digits}`;
    }

    if (digits.length === 12 && digits.startsWith('57')) {
      return digits;
    }

    if (digits.startsWith('00') && digits.length > 4) {
      return digits.slice(2);
    }

    return digits;
  }

  private async loadCategories() {
    try {
      const token = await this.authService.getIdToken();
      if (!token) {
        return;
      }

      const categories = await firstValueFrom(this.apiService.getAdminCategories(token));
      this.categories = (categories || [])
        .filter((category: any) => !!category?.name)
        .map((category: any) => ({
          id: category.id,
          _id: category._id,
          name: category.name,
          slug: category.slug,
          icon: category.icon || ''
        }));

      this.categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error cargando categorias:', error);
      this.categories = [];
    }
  }

  private async loadProducts() {
    try {
      this.isLoading = true;
      const token = await this.authService.getIdToken();
      if (!token) {
        this.showAlert('Tu sesion expiro. Inicia sesion de nuevo.', 'Cerrar', { duration: 3500 });
        this.router.navigate(['/login']);
        return;
      }

      const products = await firstValueFrom(this.apiService.getAdminProducts(token));
      this.dataSource.data = products;
      this.isLoading = false;
    } catch (error) {
      console.error('Error cargando productos:', error);
      this.showAlert('No se pudieron cargar los productos', 'Cerrar', { duration: 3000 });
      this.isLoading = false;
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'customization': return item.customization?.additions?.length ?? 0; // Ordena por cantidad de adiciones
        default: return (item as any)[property];
      }
    };

    // Personaliza la función de filtrado
    this.dataSource.filterPredicate = (data: Product, filter: string) => {
      const dataStr = data.name.toLowerCase() + ' ' + 
                     data.description.toLowerCase() + ' ' + 
                     data.category.toLowerCase() + ' ' +
                     (data.customization?.exclusions?.join(' ')?.toLowerCase() || '') + ' ' +
                     (data.customization?.additions?.map(a => a.name).join(' ')?.toLowerCase() || '');
      return dataStr.indexOf(filter) !== -1;
    };
  }

  async addProduct(newProduct: Product) {
    try {
      const token = await this.authService.getIdToken();
      if (!token) throw new Error('Usuario no autorizado');
      await firstValueFrom(this.apiService.createAdminProduct(newProduct, token));
      this.showAlert('Producto añadido correctamente', 'Cerrar', { duration: 3000 });
      await this.loadProducts();
    } catch (error) {
      console.error('Error al añadir producto:', error);
      this.showAlert('Error al añadir el producto', 'Cerrar', { duration: 3000 });
    }
  }

  async updateProduct(updatedProduct: Product) {
    if (!updatedProduct.id) {
      return;
    }

    try {
      const token = await this.authService.getIdToken();
      if (!token) throw new Error('Usuario no autorizado');

      await firstValueFrom(this.apiService.updateAdminProduct(updatedProduct, token));
      this.showAlert('Producto actualizado correctamente', 'Cerrar', { duration: 3000 });
      await this.loadProducts();
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      this.showAlert('Error al actualizar el producto', 'Cerrar', { duration: 3000 });
    }
  }

  async deleteProduct(id: string) {
    const confirmation = confirm('¿Estás seguro de que deseas eliminar este producto?');
    if (!confirmation) {
      return;
    }

    try {
      const token = await this.authService.getIdToken();
      if (!token) throw new Error('Usuario no autorizado');

      await firstValueFrom(this.apiService.deleteAdminProduct(id, token));
      this.showAlert('Producto eliminado correctamente', 'Cerrar', { duration: 3000 });
      await this.loadProducts();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      this.showAlert('Error al eliminar el producto', 'Cerrar', { duration: 3000 });
    }
  }

  openDialog(product?: Product) {
    const dialogRef = this.dialog.open(EditProductDialog, {
      width: '700px',
      data: product
        ? { ...product, categories: this.categoryNames }
        : {
            name: '',
            description: '',
            price: 0,
            image: '',
            category: null,
            categories: this.categoryNames,
            customization: { exclusions: [], additions: [] }
          }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.id) {
          this.updateProduct(result);
        } else {
          this.addProduct(result);
        }
      }
    });
  }

  async createCategory() {
    const dialogResult = await this.openCategoryDialog();
    if (!dialogResult) {
      return;
    }

    const name = (dialogResult.name || '').trim();
    const icon = (dialogResult.icon || '').trim();
    const slug = this.slugify(name);

    if (!slug) {
      this.showAlert('El nombre de la categoria no es valido', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.categoryNames.some((category) => category.toLowerCase() === name.toLowerCase())) {
      this.showAlert('Esa categoria ya existe', 'Cerrar', { duration: 2500 });
      return;
    }

    try {
      const token = await this.authService.getIdToken();
      if (!token) {
        throw new Error('Usuario no autorizado');
      }

      const payload: AdminCategory = { name, slug, icon };
      await firstValueFrom(this.apiService.createAdminCategory(payload as any, token));

      localStorage.removeItem('cachedCategories');
      this.showAlert('Categoria creada correctamente', 'Cerrar', { duration: 2500 });
      await this.loadCategories();
    } catch (error) {
      console.error('Error al crear categoria:', error);
      this.showAlert('No se pudo crear la categoria', 'Cerrar', { duration: 3000 });
    }
  }

  async editCategory(category: AdminCategory) {
    const categoryId = this.getCategoryId(category);
    if (!categoryId) {
      this.showAlert('No se encontro ID de categoria', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogResult = await this.openCategoryDialog({
      id: categoryId,
      name: category.name,
      icon: category.icon,
    });
    if (!dialogResult) {
      return;
    }

    const nextName = (dialogResult.name || '').trim();
    const nextIcon = (dialogResult.icon || '').trim();
    const nextSlug = this.slugify(nextName);

    if (!nextSlug) {
      this.showAlert('El nombre de la categoria no es valido', 'Cerrar', { duration: 3000 });
      return;
    }

    if (
      nextName === (category.name || '') &&
      nextSlug === (category.slug || '') &&
      nextIcon === (category.icon || '')
    ) {
      return;
    }

    if (
      this.categories.some(
        (item) =>
          item.name.toLowerCase() === nextName.toLowerCase() &&
          this.getCategoryId(item) !== categoryId
      )
    ) {
      this.showAlert('Ya existe una categoria con ese nombre', 'Cerrar', { duration: 2500 });
      return;
    }

    try {
      const token = await this.authService.getIdToken();
      if (!token) {
        throw new Error('Usuario no autorizado');
      }

      const payload: AdminCategory = {
        id: categoryId,
        name: nextName,
        slug: nextSlug,
        icon: nextIcon
      };

      await firstValueFrom(this.apiService.updateAdminCategory(payload as any, token));
      localStorage.removeItem('cachedCategories');
      this.showAlert('Categoria actualizada', 'Cerrar', { duration: 2500 });
      await this.loadCategories();
    } catch (error) {
      console.error('Error al editar categoria:', error);
      this.showAlert('No se pudo actualizar la categoria', 'Cerrar', { duration: 3000 });
    }
  }

  async deleteCategory(category: AdminCategory) {
    const categoryId = this.getCategoryId(category);
    if (!categoryId) {
      this.showAlert('No se encontro ID de categoria', 'Cerrar', { duration: 3000 });
      return;
    }

    const productsUsingCategory = this.countProductsUsingCategory(category.name);
    if (productsUsingCategory > 0) {
      this.showAlert(
        `No se puede eliminar. ${productsUsingCategory} producto(s) usan esta categoria.`,
        'Cerrar',
        { duration: 3800 }
      );
      return;
    }

    const confirmation = await this.confirmDeleteCategory(category.name);
    if (!confirmation) {
      return;
    }

    try {
      const token = await this.authService.getIdToken();
      if (!token) {
        throw new Error('Usuario no autorizado');
      }

      await firstValueFrom(this.apiService.deleteAdminCategory(categoryId, token));
      localStorage.removeItem('cachedCategories');
      this.showAlert('Categoria eliminada', 'Cerrar', { duration: 2500 });
      await this.loadCategories();
    } catch (error) {
      console.error('Error al eliminar categoria:', error);
      const backendUsage = this.extractUsageCount(error);
      if (backendUsage > 0) {
        this.showAlert(
          `No se puede eliminar. ${backendUsage} producto(s) usan esta categoria.`,
          'Cerrar',
          { duration: 3800 }
        );
        return;
      }

      this.showAlert('No se pudo eliminar la categoria', 'Cerrar', { duration: 3000 });
    }
  }

  private countProductsUsingCategory(categoryName: string): number {
    const normalized = (categoryName || '').trim().toLowerCase();
    return this.dataSource.data.filter((product) => {
      const productCategory = (product.category || '').trim().toLowerCase();
      return productCategory === normalized;
    }).length;
  }

  private extractUsageCount(error: any): number {
    const usageCount = Number(error?.error?.usageCount);
    return Number.isFinite(usageCount) ? usageCount : 0;
  }

  get categoryNames(): string[] {
    return this.categories
      .map((category) => category.name)
      .filter((name) => !!name);
  }

  private async openCategoryDialog(initial?: Partial<AdminCategory>): Promise<Partial<AdminCategory> | undefined> {
    const dialogRef = this.dialog.open(EditCategoryDialog, {
      width: '520px',
      data: {
        id: initial?.id || initial?._id || null,
        name: initial?.name || '',
        icon: initial?.icon || '',
      },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    return result || undefined;
  }

  private async confirmDeleteCategory(categoryName: string): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDeleteDialog, {
      width: '460px',
      data: {
        title: 'Eliminar categoria',
        message: `Vas a eliminar la categoria "${categoryName}". Esta accion no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    return !!result;
  }

  private getCategoryId(category: AdminCategory): string | null {
    return category.id || category._id || null;
  }

  private slugify(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async logout() {
    try {
      await this.authService.signOut();
      sessionStorage.clear();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión con Google:', error);
      this.showAlert('Error al cerrar sesión', 'Cerrar', { duration: 3000 });
    }
  }

  formatCustomization(product: Product): string {
    const exclusions = product.customization?.exclusions?.length 
      ? `Excl: ${product.customization.exclusions.join(', ')}` 
      : '';
    
    const additions = product.customization?.additions?.length 
      ? `Add: ${product.customization.additions.map(a => `${a.name} ($${a.price})`).join(', ')}` 
      : '';
    
    return [exclusions, additions].filter(Boolean).join(' | ') || 'N/A';
  }

  // Método simplificado para mostrar adiciones en la tabla
  formatAdditions(additions: any[]): string {
    if (!additions || additions.length === 0) return 'N/A';
    return additions.map(a => `${a.name || a.nombre} ($${a.price || a.precioUnitario || 0})`).join(', ');
  }

  isUploadingImage: boolean = false;

  async uploadImageFromInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const token = await this.authService.getIdToken();
    if (!token) {
      this.showAlert('No autorizado para subir imagen', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isUploadingImage = true;
    try {
      const base64 = await this.fileToBase64(file);
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const response = await firstValueFrom(this.apiService.uploadProductImage(base64, fileName, token));
      const imageUrl = response?.imageUrl;
      if (imageUrl) {
        this.showAlert('Imagen subida correctamente. Ahora pega la URL en el formulario.', 'Cerrar', { duration: 4000 });
        navigator.clipboard.writeText(imageUrl).catch(() => {});
      } else {
        this.showAlert('Subida completada pero no se obtuvo URL', 'Cerrar', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      this.showAlert('Error subiendo imagen', 'Cerrar', { duration: 3000 });
    } finally {
      this.isUploadingImage = false;
      input.value = '';
    }
  }

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  goHorarios() {
    this.router.navigate(['/horarios']);
  }

  toggleMeseroForm() {
    this.showMeseroForm = !this.showMeseroForm;
  }

  async createMeseroUser() {
    const displayName = (this.meseroName || '').trim();
    const email = (this.meseroEmail || '').trim().toLowerCase();
    const password = String(this.meseroPassword || '');

    if (!displayName || !email || !password) {
      this.showAlert('Debes completar nombre, correo y clave', 'Cerrar', { duration: 3000 });
      return;
    }

    if (password.length < 6) {
      this.showAlert('La clave debe tener al menos 6 caracteres', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.creatingMesero = true;
      const token = await this.authService.getIdToken();
      if (!token) {
        this.showAlert('No autorizado para crear usuarios', 'Cerrar', { duration: 3200 });
        return;
      }

      await firstValueFrom(this.apiService.createAdminMeseroUser({
        displayName,
        email,
        password,
      }, token));

      this.showAlert('Usuario mesero creado correctamente', 'Cerrar', { duration: 2600 });
      this.meseroName = '';
      this.meseroEmail = '';
      this.meseroPassword = '';
      this.showMeseroForm = false;
    } catch (error: any) {
      const backendError = String(error?.error?.error || '');
      if (error?.status === 409 || backendError === 'El correo ya existe') {
        this.showAlert('El correo ya existe', 'Cerrar', { duration: 3000 });
      } else if (error?.status === 404) {
        this.showAlert('El backend no tiene la ruta de usuarios. Reinicia el API local.', 'Cerrar', { duration: 3600 });
      } else {
        this.showAlert('No se pudo crear el usuario mesero', 'Cerrar', { duration: 3200 });
      }
      console.error('Error creando usuario mesero:', error);
    } finally {
      this.creatingMesero = false;
    }
  }
}