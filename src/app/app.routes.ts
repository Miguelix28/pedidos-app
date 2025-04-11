import { Routes } from '@angular/router';
import { AdminGuard } from './guards/admin-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/menu', pathMatch: 'full' },
  { 
    path: 'menu', 
    loadComponent: () => import('./components/menu/menu.component').then(m => m.MenuComponent)
  },
  { 
    path: 'producto/:id', 
    loadComponent: () => import('./components/producto-detalle/producto-detalle.component').then(m => m.ProductoDetalleComponent)
  },
  { 
    path: 'carrito', 
    loadComponent: () => import('./components/carrito/carrito.component').then(m => m.CarritoComponent)
  },
  { 
    path: 'cart', 
    loadComponent: () => import('./components/cart/cart.component').then(m => m.CartComponent)
  },
  { 
    path: 'checkout', 
    loadComponent: () => import('./components/checkout/checkout.component').then(m => m.CheckoutComponent)
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [AdminGuard]  // Aplica el guard aquí
  },
  { 
    path: 'login', 
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '**', 
    loadComponent: () => import('./components/menu/menu.component').then(m => m.MenuComponent) // Manejo de rutas no encontradas
  }
];