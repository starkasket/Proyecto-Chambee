import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { SocketService } from './socket.service';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  tipo?: string;
  idAnuncio?: string | number;
  applicantId?: string | number;

}

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {

  private notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);

  private unreadSubject = new BehaviorSubject<boolean>(false);

  notifications$ = this.notificationsSubject.asObservable();

  hasUnreadNotifications$ = this.unreadSubject.asObservable();

  private inicializado = false;



  constructor(private readonly api: ApiService, private readonly socketService: SocketService, private readonly router: Router) { }

  inicializar(idUsuario: string, rol: string): void {

    if (this.inicializado) {
      return
    }

    this.inicializado = true;

    if (rol === 'postulante') {
      this.socketService.conectarPostulante(idUsuario);

      this.socketService.escucharAnunciosCercanos()
        .subscribe((datos) => {
          this.agregarNotificacion(datos);
        });

      this.socketService.escucharRespuestasPostulante()
        .subscribe((datos) => {
          this.agregarNotificacion(datos);
        });
    } else if (rol === 'empleador') {
      this.socketService.conectarEmpleador(idUsuario);

      this.socketService
        .escucharNuevasPostulaciones()
        .subscribe((datos) => {
          this.agregarNotificacion(datos);
        });
    }


    this.cargarNotificaciones();

  }

  cargarNotificaciones(): void {

    this.api.obtenerNotificaciones().subscribe({
      next: (notifs) => {

        const notifications = notifs.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: new Date(n.time).toLocaleString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short'
          }),
          read: n.read,
          idAnuncio: n.idAnuncio,
          applicantId: n.applicantId,
          tipo: n.tipo
        }));

        this.notificationsSubject.next(notifications);

        this.unreadSubject.next(
          notifications.some(n => !n.read)
        );
      },
      error: (err) => {
        console.error(
          'Error al obtener notificaciones',
          err
        );
      }
    });
  }

  agregarNotificacion(datos: any): void {

    const nuevaNotificacion: NotificationItem = {
      id: Date.now(),
      title: datos.titulo,
      message: datos.mensaje,
      time: 'Hace un momento',
      read: false,
      tipo: datos.tipo,
      idAnuncio: datos.idAnuncio,
      applicantId: datos.applicantId
    };

    const actuales = this.notificationsSubject.value;

    this.notificationsSubject.next([
      nuevaNotificacion,
      ...actuales
    ]);

    this.unreadSubject.next(true);
  }

  marcarTodasComoLeidas(): void {

    const actualizadas =
      this.notificationsSubject.value.map(n => ({
        ...n,
        read: true
      }));

    this.notificationsSubject.next(actualizadas);
    this.unreadSubject.next(false);

    this.api.marcarNotificacionesLeidas().subscribe({
      error: (err) => {
        console.error(
          'Error al actualizar estado de notificaciones',
          err
        );
      }
    });
  }
  marcarComoLeida(notificacion: NotificationItem): void {

    const actualizadas =
      this.notificationsSubject.value.map(n =>
        n.id === notificacion.id
          ? { ...n, read: true }
          : n
      );

    this.notificationsSubject.next(actualizadas);

    this.unreadSubject.next(
      actualizadas.some(n => !n.read)
    );
  }

  abrirNotificacion(notificacion: NotificationItem): void {

  /*   console.log('=== ABRIENDO NOTIFICACIÓN DESDE SERVICE ===');
    console.log('Notificación:', notificacion);
    console.log('Tipo:', notificacion.tipo);
    console.log('ApplicantId:', notificacion.applicantId);
    console.log('IdAnuncio:', notificacion.idAnuncio); */

    this.marcarComoLeida(notificacion);

    switch (notificacion.tipo) {
      case 'ANUNCIO_CERCANO':

        if (notificacion.idAnuncio) {
          this.router.navigate([
            '/job',
            notificacion.idAnuncio
          ]);
        }

        break;

      case 'NUEVA_POSTULACION':

        if (notificacion.applicantId) {
          this.router.navigate(['/perfil-postulante', notificacion.applicantId], {
            queryParams: {
              seguimiento: 'true',
              idAnuncio: notificacion.idAnuncio
            }
          });
        }

        break;

      case 'SEGUIMIENTO_ACEPTADO':

        if (notificacion.idAnuncio) {

          this.router.navigate([
            '/job',
            notificacion.idAnuncio
          ]);
        }

        break;


      case 'SEGUIMIENTO_RECHAZADO':

        if (notificacion.idAnuncio) {

          this.router.navigate([
            '/job',
            notificacion.idAnuncio
          ]);

        }

        break;

      case 'ANUNCIO_ELIMINADO':

        // No navegar.
        // El anuncio ya no existe.
        break;


      default:

        // Si en el futuro agregamos
        // otro tipo de notificación,
        // podemos manejarlo aquí.

        break;

    }


  }
  get notifications(): NotificationItem[] {
    return this.notificationsSubject.value;
  }

  get hasUnreadNotifications(): boolean {
    return this.unreadSubject.value;
  }

}
