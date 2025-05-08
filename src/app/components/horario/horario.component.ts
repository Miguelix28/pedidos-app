import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../services/google.auth.service';
import { Horario, HorarioService } from '../../services/horario.service';
import { take } from 'rxjs/operators';

interface DiaSemana {
  nombre: string;
  valor: string;
}

interface HoraDisplay {
  texto: string;
  valor: number;
}

@Component({
  selector: 'app-horario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.css']
})
export class HorarioComponent implements OnInit {
  horarioForm!: FormGroup;
  isLoading: boolean = true;
  isAdmin: boolean = false;
  
  diasSemana: DiaSemana[] = [
    { nombre: 'Lunes', valor: 'lunes' },
    { nombre: 'Martes', valor: 'martes' },
    { nombre: 'Miércoles', valor: 'miercoles' },
    { nombre: 'Jueves', valor: 'jueves' },
    { nombre: 'Viernes', valor: 'viernes' },
    { nombre: 'Sábado', valor: 'sabado' },
    { nombre: 'Domingo', valor: 'domingo' }
  ];
  
  horasDisponibles: HoraDisplay[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private firestore: Firestore,
    private horarioService: HorarioService,
    private authService: GoogleAuthService,
    private snackBar: MatSnackBar
  ) {
    // Generar horas disponibles (0-23)
    for (let i = 0; i < 24; i++) {
      this.horasDisponibles.push({
        texto: this.formatHora(i),
        valor: i
      });
    }
  }

  ngOnInit(): void {
    // Verificar si el usuario está autenticado
    if (!this.authService.isLoggedIn()) {
      this.mostrarError('No has iniciado sesión. Por favor, inicia sesión para continuar.');
      this.router.navigate(['/login']);
      return;
    }
    
    this.inicializarFormulario();
    this.cargarHorario();
    this.getDiaActual();
  }

  inicializarFormulario(): void {
    // Crear el FormGroup con FormGroups anidados para cada día
    const diasFormGroup: any = {};
    
    this.diasSemana.forEach(dia => {
      diasFormGroup[dia.valor] = this.fb.group({
        abierto: [false],
        inicio: [9, Validators.required],
        fin: [18, Validators.required]
      });
    });
    
    this.horarioForm = this.fb.group({
      dias: this.fb.group(diasFormGroup)
    });
  }

  cargarHorario(): void {
    this.isLoading = true;
    
    this.horarioService.getHorario().subscribe({
      next: (horario: any) => {
        // Para cada día del horario, actualizamos el formulario
        this.diasSemana.forEach(dia => {
          if (horario[dia.valor]) {
            const diaForm = this.horarioForm.get(['dias', dia.valor]);
            if (diaForm) {
              diaForm.patchValue({
                abierto: horario[dia.valor].abierto,
                inicio: horario[dia.valor].inicio,
                fin: horario[dia.valor].fin
              });
            }
          }
        });
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar horario:', error);
        this.mostrarError('Error al cargar los horarios. Por favor, intenta de nuevo más tarde.');
        this.isLoading = false;
      }
    });
  }

  guardarHorario(): void {
    if (this.horarioForm.invalid) {
      this.mostrarError('El formulario contiene errores. Por favor, revísalo e intenta de nuevo.');
      return;
    }
    
    // Verificar si sigue autenticado
    if (!this.authService.isLoggedIn()) {
      this.mostrarError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      this.router.navigate(['/login']);
      return;
    }
    
    this.isLoading = true;
   
    // Crear objeto de horario a partir del formulario
    const nuevoHorario: Horario = {};
        
    this.diasSemana.forEach(dia => {
      const diaForm = this.horarioForm.get(['dias', dia.valor]);
      if (diaForm) {
        nuevoHorario[dia.valor] = {
          abierto: diaForm.get('abierto')?.value || false,
          inicio: Number(diaForm.get('inicio')?.value) || 0,
          fin: Number(diaForm.get('fin')?.value) || 0
        };
      }
    });
    
    // Usar el servicio en lugar de acceder directamente a Firestore
    this.horarioService.saveHorario(nuevoHorario)
      .subscribe({
        next: () => {
          this.mostrarMensaje('Horario guardado correctamente');
          this.isLoading = false;
          this.volverAdmin();
        },
        error: (error) => {
          console.error('Error al guardar el horario:', error);
          let mensajeError = 'Error al guardar el horario: ';
          
          // Personalizar mensaje según el tipo de error
          if (error.code === 'permission-denied') {
            mensajeError += 'No tienes permisos suficientes. Verifica que tu cuenta tenga rol de administrador.';
          } else if (error.code === 'unauthenticated') {
            mensajeError += 'Tu sesión ha expirado. Inicia sesión nuevamente.';
            this.router.navigate(['/login']);
          } else {
            mensajeError += error.message || 'Verifica tu conexión e inténtalo de nuevo';
          }
          
          this.mostrarError(mensajeError);
          this.isLoading = false;
        }
      });
  }

  getDiaActual(): string {
    // Devuelve el valor (clave) del día actual, ej: 'miercoles'
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const hoy = new Date().getDay();
    return dias[hoy];
  }
  esHoy(diaValor: string): boolean {
    return diaValor === this.getDiaActual();
  }
  horasValidas(dia: string): boolean {
    const diaForm = this.horarioForm.get(['dias', dia]);
    if (!diaForm) return true;
    
    const inicio = diaForm.get('inicio')?.value;
    const fin = diaForm.get('fin')?.value;
    
    // Si el día está cerrado, no hay restricciones
    if (!diaForm.get('abierto')?.value) return true;
    
    // Si el horario de cierre es menor que el de apertura, se considera que cierra al día siguiente
    // Ejemplo: abre a las 20:00 y cierra a las 2:00 del día siguiente
    if (fin < inicio) {
      return true;  // Es válido cerrar al día siguiente
    }
    
    return fin > inicio;
  }

  formatHora(hora: number): string {
    const periodo = hora >= 12 ? 'PM' : 'AM';
    const hora12 = hora % 12 || 12; // Convierte 0 a 12
    return `${hora12}:00 ${periodo}`;
  }

  volverAdmin(): void {
    this.router.navigate(['/admin']);
  }

  logout(): void {
    this.authService.signOut()
      .then(() => {
        this.router.navigate(['/login']);
      })
      .catch((error: any) => {
        console.error('Error al cerrar sesión:', error);
        this.mostrarError('Error al cerrar sesión. Inténtalo de nuevo.');
      });
  }
  
  // Métodos para mostrar mensajes y errores
  mostrarMensaje(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
  
  mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }
}