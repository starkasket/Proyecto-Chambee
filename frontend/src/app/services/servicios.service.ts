import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Service {
  title: string;
  description: string;
  img?: string;
  categoria?: string;
  presupuesto?: string;
  ubicacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiciosService {
  
  private serviciosIniciales: Service[] = [];
   

  private serviciosSource = new BehaviorSubject<Service[]>(this.serviciosIniciales);
  servicios$ = this.serviciosSource.asObservable();

  constructor() { }

  agregarServicio(nuevoServicio: Service) {
    const serviciosActuales = this.serviciosSource.getValue();
    
    if (!nuevoServicio.img) {
        nuevoServicio.img = `https://picsum.photos/80/80?random=${Math.floor(Math.random() * 1000)}`;
    }
    
    this.serviciosSource.next([nuevoServicio, ...serviciosActuales]);
  }
}