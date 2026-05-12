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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ApiService } from '../../services/api.service';
import { GoogleAuthService } from '../../services/google.auth.service';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../services/alert.service';

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
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './edit-product-dialog.component.html',
  styleUrls: ['./edit-product-dialog.component.css']
})
export class EditProductDialog {
  productForm: FormGroup;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  isUploadingImage = false;
  staticCategories = [
    'Hamburguesa',
    'Pizzas',
    'Bebidas',
    'Postres',
    'Complementos',
    'Arma tu salchi',
    'Salchipapa',
  ];
  categories: string[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditProductDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private apiService: ApiService,
    private authService: GoogleAuthService,
    private alertService: AlertService
  ) {
    const incomingCategories = Array.isArray(data?.categories) ? data.categories : [];
    this.categories = incomingCategories.length ? incomingCategories : this.staticCategories;

    this.productForm = this.fb.group({
      id: [data?._id || null],
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

  createAdditionFormGroup(addition: Addition = { name: '', price: 0 }) {
    return this.fb.group({
      name: [addition.name, Validators.required],
      price: [addition.price, [Validators.required, Validators.min(0)]]
    });
  }

  get additionsArray() {
    return this.productForm.get('customization')?.get('additions') as FormArray;
  }

  get exclusions() {
    return this.productForm.get('customization')?.get('exclusions')?.value || [];
  }

  addAddition() {
    this.additionsArray.push(this.createAdditionFormGroup());
  }

  removeAddition(index: number) {
    this.additionsArray.removeAt(index);
  }

  addExclusion(event: MatChipInputEvent) {
    const value = (event.value || '').trim();
    if (value) {
      const currentExclusions = [...this.exclusions];
      currentExclusions.push(value);
      this.productForm.get('customization')?.get('exclusions')?.setValue(currentExclusions);
      event.chipInput!.clear();
    }
  }

  removeExclusion(exclusion: string) {
    const currentExclusions = this.exclusions.filter((e: string) => e !== exclusion);
    this.productForm.get('customization')?.get('exclusions')?.setValue(currentExclusions);
  }

  // 👇 Método para subir imagen
  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const token = await this.authService.getIdToken();
    if (!token) {
      this.alertService.warning('No autorizado', 3000);
      return;
    }

    this.isUploadingImage = true;
    try {
      const base64 = await this.fileToBase64(file);
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const response = await firstValueFrom(
        this.apiService.uploadProductImage(base64, fileName, token)
      );

      if (response?.imageUrl) {
        this.productForm.get('image')?.setValue(response.imageUrl);
        this.alertService.success('Imagen subida correctamente', 3000);
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      this.alertService.error('Error al subir la imagen', 3000);
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
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  onSave() {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      if (formValue.category === 'Salchipapa') {
        formValue.customization.size = ['Personal', 'Para 2'];
      }
      this.dialogRef.close(formValue);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}