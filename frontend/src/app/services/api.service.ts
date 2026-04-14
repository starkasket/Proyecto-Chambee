import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  //Empleador
  registrarEmpleador(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleadores/registro`, datos);
  }

  //Postulante 
  registrarPostulante(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/postulantes/registro`, datos);
  }

  obtenerPerfilEmpleador(idEmpleador: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/empleadores/${idEmpleador}/perfil`, {
      headers: {
        Authorization: 'Bearer ' + this.authService.getToken()
      }
    });
  }

  getUsuario(): any {
    const user = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    return user ? JSON.parse(user) : null;
  }

  getMiPerfil() {
    // CORRECCIÓN: Usar la variable de entorno this.apiUrl
    return this.http.get(`${this.apiUrl}/mi-perfil`, {
      headers: {
        Authorization: 'Bearer ' + this.authService.getToken()
      }
    });
  }
  
  actualizarMiPerfil(datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/mi-perfil`, datos, {
      headers: {
        Authorization: 'Bearer ' + this.authService.getToken()
      }
    });
  }

  actualizarPerfilEmpleador(idEmpleador: number | string, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/empleadores/${idEmpleador}/perfil`, datos, {
      headers: {
        Authorization: 'Bearer ' + this.authService.getToken()
      }
    });
  }

  obtenerAnunciosEmpleador(idEmpleador: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios`, {
      headers: {
        Authorization: 'Bearer ' + this.authService.getToken()
      }
    });
  }

  crearAnuncioEmpleador(idEmpleador: number | string, datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios`, datos, {
      headers: {
        Authorization: 'Bearer ' + this.authService.getToken()
      }
    });
  }

  obtenerAnunciosPublicos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/anuncios`);
  }

  // Buscar por codigo postal
  getSepomex(): Observable<any[]> {
    return this.http.get<any[]>('assets/sepomex_gto.json');
  }
}