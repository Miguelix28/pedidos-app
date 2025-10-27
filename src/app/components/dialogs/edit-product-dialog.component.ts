import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

// Interfaz para adiciones
interface Addition {
  name: string;
  price: number;
}

@Component({
  selector: 'app-edit-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './edit-product-dialog.component.html',
  styleUrls: ['./edit-product-dialog.component.css']
})
export class EditProductDialog {
  productForm: FormGroup;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  categories = [
  'Hamburguesa',
  'Pizzas',
  'Bebidas',
  'Postres',
  'Complementos',
  'Arma tu salchi', 
  'Salchipapa',    
];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditProductDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Inicializa el formulario con los datos del producto o valores por defecto
    this.productForm = this.fb.group({
      id: [data?.id || null],
      name: [data?.name || '', [Validators.required, Validators.minLength(3)]],
      description: [data?.description || '', Validators.required],
      price: [data?.price || 0, [Validators.required, Validators.min(0)]],
      image: [data?.image || '', Validators.required],
      category: [data?.category || '', Validators.required],
      customization: this.fb.group({
        exclusions: [data?.customization?.exclusions || []],
        additions: this.fb.array(this.buildAdditionsFormArray(data?.customization?.additions || [])),
        complements: this.fb.array(this.buildComplementsFormArray(data?.customization?.complements || []))
      })
    });
  }

  // Construye un FormArray para las adiciones
  buildAdditionsFormArray(additions: Addition[]) {
    return additions.map(addition => this.createAdditionFormGroup(addition));
  }

  buildComplementsFormArray(complements: Addition[]) {
    return complements.map(complement => this.createAdditionFormGroup(complement));
  }

  get complementsArray() {
  return this.productForm.get('customization')?.get('complements') as FormArray;
}

addComplement() {
  this.complementsArray.push(this.createAdditionFormGroup());
}

removeComplement(index: number) {
  this.complementsArray.removeAt(index);
}

  // Crea un FormGroup para una adición
  createAdditionFormGroup(addition: Addition = { name: '', price: 0 }) {
    return this.fb.group({
      name: [addition.name, Validators.required],
      price: [addition.price, [Validators.required, Validators.min(0)]]
    });
  }

  // Getter para el FormArray de adiciones
  get additionsArray() {
    return this.productForm.get('customization')?.get('additions') as FormArray;
  }

  // Getter para las exclusiones
  get exclusions() {
    return this.productForm.get('customization')?.get('exclusions')?.value || [];
  }

  // Agregar una nueva adición al FormArray
  addAddition() {
    this.additionsArray.push(this.createAdditionFormGroup());
  }

  // Eliminar una adición del FormArray
  removeAddition(index: number) {
    this.additionsArray.removeAt(index);
  }

  // Agregar una exclusión
  addExclusion(event: MatChipInputEvent) {
    const value = (event.value || '').trim();
    if (value) {
      const currentExclusions = [...this.exclusions];
      currentExclusions.push(value);
      this.productForm.get('customization')?.get('exclusions')?.setValue(currentExclusions);
      event.chipInput!.clear();
    }
  }

  // Eliminar una exclusión
  removeExclusion(exclusion: string) {
    const currentExclusions = this.exclusions.filter((e: string) => e !== exclusion);
    this.productForm.get('customization')?.get('exclusions')?.setValue(currentExclusions);
  }

  // Guardar los cambios
  onSave() {
    if (this.productForm.valid) {
      this.dialogRef.close(this.productForm.value);
    }
  }

  // Cancelar
  onCancel() {
    this.dialogRef.close();
  }
}