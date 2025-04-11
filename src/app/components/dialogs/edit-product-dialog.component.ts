import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { MatChipInputEvent, MatChipEditedEvent } from '@angular/material/chips';
import { ENTER, COMMA } from '@angular/cdk/keycodes';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  customization: {
    exclusions: string[];
    additions: { name: string; price: number }[];
  };
}

@Component({
  selector: 'app-edit-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    FormsModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './edit-product-dialog.component.html',
  styleUrls: ['./edit-product-dialog.component.css']
})
export class EditProductDialog {
  isNew: boolean = false;
  readonly separatorKeysCodes = [ENTER, COMMA] as const; // Teclas para separar chips
  newExclusion: string = ''; // Nueva exclusión
  newAddition: string = ''; // Nueva adición

  constructor(
    public dialogRef: MatDialogRef<EditProductDialog>,
    @Inject(MAT_DIALOG_DATA) public product: Product,
    private announcer: LiveAnnouncer // Para anunciar cambios accesibles
  ) {
    this.isNew = !product.id;

    // Inicializa las exclusiones y adiciones si no existen
    if (!product.customization) {
      this.product.customization = { exclusions: [], additions: [] };
    }
  }

  // Método para agregar una exclusión
  addExclusion(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Agregar la exclusión
    if (value) {
      this.product.customization.exclusions.push(value);
    }

    // Limpiar el input
    event.chipInput!.clear();
  }

  // Método para eliminar una exclusión
  removeExclusion(exclusion: string): void {
    const index = this.product.customization.exclusions.indexOf(exclusion);
    if (index >= 0) {
      this.product.customization.exclusions.splice(index, 1);
      this.announcer.announce(`Exclusión eliminada: ${exclusion}`);
    }
  }

  // Método para editar una exclusión
  editExclusion(exclusion: string, event: MatChipEditedEvent): void {
    const value = event.value.trim();

    // Eliminar la exclusión si no tiene nombre
    if (!value) {
      this.removeExclusion(exclusion);
      return;
    }

    // Editar la exclusión
    const index = this.product.customization.exclusions.indexOf(exclusion);
    if (index >= 0) {
      this.product.customization.exclusions[index] = value;
    }
  }

  // Método para agregar una adición
  addAddition() {
    this.product.customization.additions.push({ name: '', price: 0 });
  }

  // Método para eliminar una adición
  removeAddition(index: number) {
    const removed = this.product.customization.additions.splice(index, 1)[0];
    this.announcer.announce(`Adición eliminada: ${removed?.name}`);
  }

  updateAdditionName(index: number, newName: string) {
    this.product.customization.additions[index].name = newName;
  }
  
  updateAdditionPrice(index: number, newPrice: number) {
    this.product.customization.additions[index].price = newPrice;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close(this.product);
  }
}