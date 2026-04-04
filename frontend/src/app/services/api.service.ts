import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

 /*getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`);
  }*/

  //Empleador
  registrarEmpleador(datos: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/empleadores/registro`, datos);
}

  //Postulante 
registrarPostulante(datos: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/postulantes/registro`, datos);
}

  obtenerPerfilEmpleador(idEmpleador: number | string): Observable<any> {
    // Endpoint usado por el componente de perfil de empleador.
    return this.http.get(`${this.apiUrl}/empleadores/${idEmpleador}/perfil`);
  }
// Buscar por codigo postal
  getSepomex(): Observable<any[]> {
    return this.http.get<any[]>('assets/sepomex_gto.json');
  }
}
