import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { GoogleAuthService } from '../../services/google.auth.service';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../services/alert.service';

interface CategoryDialogData {
  id?: string;
  name?: string;
  icon?: string;
}

@Component({
  selector: 'app-edit-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './edit-category-dialog.component.html',
  styleUrls: ['./edit-category-dialog.component.css']
})
export class EditCategoryDialog {
  isUploadingImage = false;

  categoryForm;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditCategoryDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CategoryDialogData,
    private apiService: ApiService,
    private authService: GoogleAuthService,
    private alertService: AlertService
  ) {
    this.categoryForm = this.fb.group({
      id: [this.data?.id || null],
      name: [this.data?.name || '', [Validators.required, Validators.minLength(2)]],
      icon: [this.data?.icon || ''],
    });
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

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
      const response = await firstValueFrom(this.apiService.uploadProductImage(base64, fileName, token, 'categories'));
      if (response?.imageUrl) {
        this.categoryForm.get('icon')?.setValue(response.imageUrl);
        this.alertService.success('Imagen subida correctamente', 2500);
      } else {
        this.alertService.warning('No se obtuvo URL de imagen', 3000);
      }
    } catch (error) {
      console.error('Error subiendo imagen de categoria:', error);
      this.alertService.error('Error al subir imagen', 3000);
    } finally {
      this.isUploadingImage = false;
      input.value = '';
    }
  }

  onSave() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const formValue = this.categoryForm.getRawValue();
    this.dialogRef.close({
      id: formValue.id || undefined,
      name: (formValue.name || '').trim(),
      icon: (formValue.icon || '').trim(),
    });
  }

  onCancel() {
    this.dialogRef.close();
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
}
