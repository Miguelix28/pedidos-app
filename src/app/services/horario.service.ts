import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface HorarioDia {
  abierto: boolean;
  inicio: number; // hora en formato 24h
  fin: number;
}

export interface Horario {
  [dia: string]: HorarioDia;
}

@Injectable({
  providedIn: 'root'
})
export class HorarioService {
  constructor(private firestore: Firestore) {}

  /**
   * Obtiene el horario de la base de datos
   */
  getHorario(): Observable<Horario> {
    const horarioRef = doc(this.firestore, 'config', 'horario');
    
    return from(getDoc(horarioRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return docSnap.data() as Horario;
        } else {
          console.log('No existe documento de horario, usando horario por defecto');
          return this.getHorarioDefault();
        }
      }),
      catchError(error => {
        console.error('Error al obtener horario:', error);
        return of(this.getHorarioDefault());
      })
    );
  }

  /**
   * Guarda el horario en la base de datos
   */
  saveHorario(horario: Horario): Observable<void> {
    // Verificamos que tengamos un horario válido
    if (!horario || Object.keys(horario).length === 0) {
      return throwError(() => new Error('Datos de horario inválidos'));
    }
    
    const horarioRef = doc(this.firestore, 'config', 'horario');
    
    // Sanitizamos los datos antes de enviarlos
    const sanitizedHorario: Horario = {};
    
    Object.keys(horario).forEach(dia => {
      if (horario[dia]) {
        sanitizedHorario[dia] = {
          abierto: Boolean(horario[dia].abierto),
          inicio: Number(horario[dia].inicio || 0),
          fin: Number(horario[dia].fin || 0)
        };
      }
    });
    
    console.log('Guardando horario:', sanitizedHorario);
    
    // Intentamos guardar y capturamos posibles errores
    return from(setDoc(horarioRef, sanitizedHorario)).pipe(
      tap(() => console.log('Horario guardado correctamente')),
      catchError(error => {
        console.error('Error en saveHorario:', error);
        
        // Si el error es de permisos, personalizamos el mensaje
        if (error.code === 'permission-denied') {
          return throwError(() => ({
            code: 'permission-denied',
            message: 'No tienes permisos suficientes para guardar el horario'
          }));
        }
        
        // Si es otro tipo de error, intentamos el método alternativo
        console.log('Intentando método alternativo de guardado...');
        return from(this.saveHorarioFallback(sanitizedHorario));
      })
    );
  }
  
  /**
   * Método alternativo para guardar el horario en caso de que el principal falle
   */
  private async saveHorarioFallback(horario: Horario): Promise<void> {
    try {
      // Intentamos guardar cada día por separado usando merge
      const horarioRef = doc(this.firestore, 'config', 'horario');
      await setDoc(horarioRef, horario, { merge: true });
      console.log('Horario guardado correctamente mediante fallback');
    } catch (error: any) {
      console.error('Error incluso en el fallback:', error);
      
      // Personalizar el error para mejor diagnóstico
      if (error.code === 'permission-denied') {
        throw {
          code: 'permission-denied',
          message: 'No tienes permisos suficientes para guardar el horario. Verifica que tu cuenta tenga rol de administrador.'
        };
      }
      
      throw error;
    }
  }

  /**
   * Comprueba si el local está abierto actualmente
   */
  checkEstaAbierto(): Observable<boolean> {
    return this.getHorario().pipe(
      map(horario => {
        const ahora = new Date();
        const diaSemana = this.getDiaSemana(ahora.getDay());
        const horaActual = ahora.getHours();
        
        if (!horario[diaSemana] || !horario[diaSemana].abierto) {
          return false;
        }
        
        const { inicio, fin } = horario[diaSemana];
        
        // Si el horario de cierre es menor que el de apertura, significa que cierra al día siguiente
        if (fin < inicio) {
          return horaActual >= inicio || horaActual < fin;
        } else {
          return horaActual >= inicio && horaActual < fin;
        }
      })
    );
  }

  /**
   * Convierte el número del día de la semana (0-6) a su texto en español
   */
  private getDiaSemana(dia: number): string {
    const diasSemana = [
      'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'
    ];
    return diasSemana[dia];
  }

  /**
   * Retorna un horario por defecto en caso de error
   */
  private getHorarioDefault(): Horario {
    return {
      lunes: { abierto: true, inicio: 9, fin: 18 },
      martes: { abierto: true, inicio: 9, fin: 18 },
      miercoles: { abierto: true, inicio: 9, fin: 18 },
      jueves: { abierto: true, inicio: 9, fin: 18 },
      viernes: { abierto: true, inicio: 9, fin: 20 },
      sabado: { abierto: true, inicio: 10, fin: 15 },
      domingo: { abierto: false, inicio: 0, fin: 0 }
    };
  }

  /**
   * Formatea las horas de un día para mostrarlas
   */
  formatHorarioDia(dia: HorarioDia): string {
    if (!dia.abierto) return 'Cerrado';
    return `${this.formatHora(dia.inicio)} - ${this.formatHora(dia.fin)}`;
  }

  /**
   * Formatea una hora en formato 24h a formato 12h
   */
  private formatHora(hora: number): string {
    const periodo = hora >= 12 ? 'PM' : 'AM';
    const hora12 = hora % 12 || 12; // Convierte 0 a 12
    return `${hora12}:00 ${periodo}`;
  }
}