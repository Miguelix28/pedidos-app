import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, collectionData } from '@angular/fire/firestore';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { EditProductDialog } from '../dialogs/edit-product-dialog.component';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../services/google.auth.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  customization: {
    exclusions: string[];
    additions: {
      name: string;
      price: number;
    }[];
  };
}

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
    MatSnackBarModule,
    MatTooltipModule,
    ReactiveFormsModule
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  dataSource = new MatTableDataSource<Product>([]);
  products$: Observable<Product[]>;
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private firestore: Firestore, 
    public dialog: MatDialog, 
    private router: Router,
    private authService: GoogleAuthService,
    private snackBar: MatSnackBar
  ) {
    const productsRef = collection(this.firestore, 'products');
    this.products$ = collectionData(productsRef, { idField: 'id' }) as Observable<Product[]>;
  }

  ngOnInit(): void {
    // Carga los productos en tiempo real a la tabla
    this.products$.subscribe(products => {
      this.dataSource.data = products;
      this.isLoading = false;
       if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    });

    // Configura el filtro de búsqueda
    this.searchControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe(value => {
        this.dataSource.filter = (value || '').trim().toLowerCase();
      });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'customization': return item.customization.additions.length; // Ordena por cantidad de adiciones
        default: return (item as any)[property];
      }
    };

    // Personaliza la función de filtrado
    this.dataSource.filterPredicate = (data: Product, filter: string) => {
      const dataStr = data.name.toLowerCase() + ' ' + 
                     data.description.toLowerCase() + ' ' + 
                     data.category.toLowerCase() + ' ' +
                     data.customization.exclusions.join(' ').toLowerCase() + ' ' +
                     data.customization.additions.map(a => a.name).join(' ').toLowerCase();
      return dataStr.indexOf(filter) !== -1;
    };
  }

  async addProduct(newProduct: Product) {
    try {
      const productsRef = collection(this.firestore, 'products');
      await addDoc(productsRef, newProduct);
      this.snackBar.open('Producto añadido correctamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error al añadir producto:', error);
      this.snackBar.open('Error al añadir el producto', 'Cerrar', { duration: 3000 });
    }
  }

  async updateProduct(updatedProduct: Product) {
    if (updatedProduct.id) {
      try {
        const productRef = doc(this.firestore, 'products', updatedProduct.id);
        const productToUpdate = { ...updatedProduct };
        delete productToUpdate.id; // Eliminamos el ID para no incluirlo en el update
        await updateDoc(productRef, { ...productToUpdate });
        this.snackBar.open('Producto actualizado correctamente', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('Error al actualizar producto:', error);
        this.snackBar.open('Error al actualizar el producto', 'Cerrar', { duration: 3000 });
      }
    }
  }

  async deleteProduct(id: string) {
    const confirmation = confirm('¿Estás seguro de que deseas eliminar este producto?');
    if (confirmation) {
      try {
        const productRef = doc(this.firestore, 'products', id);
        await deleteDoc(productRef);
        this.snackBar.open('Producto eliminado correctamente', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('Error al eliminar producto:', error);
        this.snackBar.open('Error al eliminar el producto', 'Cerrar', { duration: 3000 });
      }
    }
  }

  openDialog(product?: Product) {
    const dialogRef = this.dialog.open(EditProductDialog, {
      width: '700px',
      data: product ? { ...product } : { 
        name: '', 
        description: '', 
        price: 0, 
        image: '', 
        category: null, 
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

  async logout() {
    try {
      await this.authService.signOut();
      sessionStorage.clear();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión con Google:', error);
      this.snackBar.open('Error al cerrar sesión', 'Cerrar', { duration: 3000 });
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

  goHorarios() {
    this.router.navigate(['/horarios']);
  }
}