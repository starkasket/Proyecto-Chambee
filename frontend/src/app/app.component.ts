import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificacionService } from './services/notificacion.service';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  constructor(
    private readonly api: ApiService,
    private readonly notificationService: NotificacionService
  ) { }

  ngOnInit() {

    const usuario = this.api.getUsuario();

    if (usuario?.id && usuario?.rol === 'postulante') {

      this.notificationService.inicializar(
        String(usuario.id), usuario.rol
      );
    }
  }
}


