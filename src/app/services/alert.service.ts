import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  toast(message: string, icon: SweetAlertIcon = 'info', duration: number = 3000): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title: message,
      showConfirmButton: false,
      timer: duration,
      timerProgressBar: true,
    });
  }

  success(message: string, duration: number = 2500): void {
    this.toast(message, 'success', duration);
  }

  error(message: string, duration: number = 3500): void {
    this.toast(message, 'error', duration);
  }

  warning(message: string, duration: number = 3200): void {
    this.toast(message, 'warning', duration);
  }

  info(message: string, duration: number = 3000): void {
    this.toast(message, 'info', duration);
  }

  loading(title: string = 'Procesando...'): void {
    Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  }

  closeLoading(): void {
    if (Swal.isVisible()) {
      Swal.close();
    }
  }
}
