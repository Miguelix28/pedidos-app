import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,MatIconModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'pedidos-app';
  mostrarMenu = true;

  constructor(private router: Router) {
    this.router.events.subscribe(() => {
      // Ocultar el menú en la ruta del carrito y otras específicas
      // const rutasSinMenu = ['/carrito', '/checkout'];
      // this.mostrarMenu = !rutasSinMenu.includes(this.router.url);
      // this.mostrarMenu = true;
      const rutasSinMenu = ['/menu', '/carrito'];
      this.mostrarMenu = rutasSinMenu.includes(this.router.url);
    });
  }
}
