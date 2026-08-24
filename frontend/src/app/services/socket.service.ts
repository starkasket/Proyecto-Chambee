import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000');
  }

  conectarEmpleador(idEmpleador: string) {
    this.socket.emit('joinRoom', idEmpleador);
  }

  conectarPostulante(idPostulante: string) {
    this.socket.emit('joinRoom', idPostulante);
  }

  conectarUsuario(idUsuario: string) {
    this.socket.emit('joinRoom', idUsuario);
  }

  escucharNuevasPostulaciones(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('new_application', (data: any) => {
        observer.next(data);
      });
    });
  }

  escucharAnunciosCercanos(): Observable<any> {
    return new Observable((observer) => {

      this.socket.on('nearby_job', (data: any) => {
        observer.next(data);
      });

    });
  }

  escucharRespuestasPostulante(): Observable<any> {
    /*   return new Observable((observer) => {
        this.socket.on('application_accepted', (data: any) => {
          observer.next(data);
        });
      }); */


    return new Observable((observer) => {

      this.socket.on('application_accepted', (data: any) => {

        observer.next({
          ...data,
          tipo: 'SEGUIMIENTO_ACEPTADO'
        });

      });

    });
  }

  escucharRechazosPostulante(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('application_rejected', (data: any) => {
        observer.next(data);
      });
    });
  }
} 