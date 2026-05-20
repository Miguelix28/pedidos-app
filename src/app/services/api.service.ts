import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product, Category } from './firebase.service';

export type { Product, Category } from './firebase.service';

export interface OrderItem {
  productId: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
  customization?: any;
}

export interface OrderPayload {
  customerName: string;
  customerPhone: string;
  orderType: string;
  source?: 'cliente' | 'mesero';
  tableNumber?: string;
  deliveryAddress?: string;
  paymentMethod: string;
  paymentAmount: number;
  subtotal: number;
  total: number;
  note?: string;
  items: OrderItem[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getProducts(category?: string, search?: string): Observable<Product[]> {
    const params: any = {};
    if (category) params.category = category;
    if (search) params.search = search;
    return this.http.get<Product[]>(`${this.baseUrl}/products`, { params });
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`);
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/products`, { params: { id } });
  }

  createProduct(product: Partial<Product> | any): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/products`, product);
  }

  createOrder(order: OrderPayload, firebaseIdToken?: string): Observable<any> {
    if (firebaseIdToken) {
      const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
      return this.http.post<any>(`${this.baseUrl}/orders`, order, { headers });
    }

    return this.http.post<any>(`${this.baseUrl}/orders`, order);
  }

  getOrders(firebaseIdToken: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${firebaseIdToken}`
    });
    return this.http.get<any>(`${this.baseUrl}/orders`, { headers });
  }

  // admin endpoints
  getAdminProducts(firebaseIdToken: string): Observable<Product[]> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.get<Product[]>(`${this.baseUrl}/admin/products`, { headers });
  }

  createAdminProduct(product: Product, firebaseIdToken: string): Observable<Product> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.post<Product>(`${this.baseUrl}/admin/products`, product, { headers });
  }

  updateAdminProduct(product: Product, firebaseIdToken: string): Observable<Product> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.put<Product>(`${this.baseUrl}/admin/products`, product, { headers });
  }

  deleteAdminProduct(productId: string, firebaseIdToken: string): Observable<void> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.delete<void>(`${this.baseUrl}/admin/products?id=${productId}`, { headers });
  }

  uploadProductImage(imageBase64: string, fileName: string, firebaseIdToken: string, folder: string = 'products'): Observable<any> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.post<any>(`${this.baseUrl}/admin/upload-image`, { imageBase64, fileName, folder }, { headers });
  }

  getAdminCategories(firebaseIdToken: string): Observable<Category[]> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.get<Category[]>(`${this.baseUrl}/admin/categories`, { headers });
  }

  createAdminCategory(category: Category, firebaseIdToken: string): Observable<Category> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.post<Category>(`${this.baseUrl}/admin/categories`, category, { headers });
  }

  updateAdminCategory(category: Category, firebaseIdToken: string): Observable<Category> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.put<Category>(`${this.baseUrl}/admin/categories`, category, { headers });
  }

  deleteAdminCategory(categoryId: string, firebaseIdToken: string): Observable<void> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.delete<void>(`${this.baseUrl}/admin/categories?id=${categoryId}`, { headers });
  }

  getAdminOrders(
    filters: { period: 'day' | 'month' | 'year'; date?: string; month?: string; year?: number }
  ): Observable<any> {
    const params: any = {
      period: filters.period,
      tzOffset: new Date().getTimezoneOffset(),
    };

    if (filters.date) params.date = filters.date;
    if (filters.month) params.month = filters.month;
    if (filters.year) params.year = String(filters.year);

    return this.http.get<any>(`${this.baseUrl}/admin/orders`, { params });
  }

  updateAdminOrderStatus(orderId: string, status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/admin/orders`, { id: orderId, status });
  }

  createAdminMeseroUser(payload: { email: string; password: string; displayName: string }, firebaseIdToken: string): Observable<any> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${firebaseIdToken}` });
    return this.http.post<any>(`${this.baseUrl}/admin/users`, payload, { headers });
  }
}

