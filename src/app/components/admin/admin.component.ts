import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, collectionData } from '@angular/fire/firestore';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { EditProductDialog } from '../dialogs/edit-product-dialog.component';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../services/google.auth.service';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string; // Nuevo campo
  customization: { // Nuevo campo
    exclusions: string[];
    additions: string[];
  };
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTableModule, MatButtonModule, MatDialogModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  dataSource = new MatTableDataSource<Product>([]); 
  products$: Observable<Product[]>;
  displayedColumns: string[] = [
    'name',
    'description',
    'price',
    'category',
    'exclusions',
    'additions',
    'image',
    'actions'
  ];
  newProduct: Product = {
    name: '', description: '', price: 0, image: '',
    category: '',
    customization: {
      exclusions: [],
      additions: []
    }
  };
  editingProduct: Product | null = null;

  constructor(private firestore: Firestore, public dialog: MatDialog, private router: Router,private authService: GoogleAuthService,) {
    const productsRef = collection(this.firestore, 'products');
    this.products$ = collectionData(productsRef, { idField: 'id' }) as Observable<Product[]>;
  }

  ngOnInit(): void {
    // 📌 Carga los productos en tiempo real a la tabla
    this.products$.subscribe(products => {
      this.dataSource.data = products;
    });
  }

  async addProduct(newProduct: Product) {
    const productsRef = collection(this.firestore, 'products');
    await addDoc(productsRef, newProduct);
  }

  editProduct(product: Product) {
    this.editingProduct = { ...product };
  }

  async updateProduct(updatedProduct: Product) {
    if (updatedProduct.id) {
      const productRef = doc(this.firestore, 'products', updatedProduct.id);
      await updateDoc(productRef, { ...updatedProduct });
    }
  }

  async deleteProduct(id: string) {
    const productRef = doc(this.firestore, 'products', id);
    await deleteDoc(productRef);
  }

  cancelEdit() {
    this.editingProduct = null;
  }

  openDialog(product?: Product) {
    const dialogRef = this.dialog.open(EditProductDialog, {
      width: '600px', // Ajusta el ancho del modal
      data: product ? { ...product } : { 
        name: '', 
        description: '', 
        price: 0, 
        image: '', 
        category: '', 
        customization: { exclusions: [], additions: [] } // Inicializa customization
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.id) {
          this.updateProduct(result); // Si tiene ID, es edición
        } else {
          this.addProduct(result); // Si no tiene ID, es nuevo
        }
      }
    });
  }
  async logout() {
    this.authService.signOut().then(() => {
      sessionStorage.clear();
      this.router.navigate(['/login']);
    });
    try {
      await this.authService.signOut().then(() => {
        sessionStorage.clear();
        this.router.navigate(['/login']);
      });
    } catch (error) {
      console.error('Error al cerrar sesión con Google:', error);
    }
  }

  formatAdditions(additions: any[]): string {
    if (!additions || additions.length === 0) return 'N/A';
  
    return additions.map(a => `${a.name || a.nombre} (${a.price || a.precioUnitario || 0})`).join(', ');
  }
}
