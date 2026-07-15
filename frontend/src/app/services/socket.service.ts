import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    // Asegúrate de que esta URL coincida con el puerto de tu backend en Node
    this.socket = io('http://localhost:3000'); 
  }

  // El empleador se conecta a su sala usando su ID
  conectarEmpleador(idEmpleador: string) {
    this.socket.emit('joinRoom', idEmpleador);
  }

  // Escuchamos el evento que envía el backend
  escucharNuevasPostulaciones(): Observable<any> {
    return new Observable((observer) => {
      // AQUÍ ESTÁ EL CAMBIO IMPORTANTE: (data: any)
      this.socket.on('new_application', (data: any) => {
        observer.next(data);
      });
    });
  }
  
  escucharRespuestasPostulante(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('application_accepted', (data: any) => {
        observer.next(data);
      });
    });
  }
} 