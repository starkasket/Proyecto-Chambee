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

  return this.http.get('http://localhost:3000/mi-perfil', {
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
    // Guarda los cambios del formulario de edicion del empleador.
    return this.http.put(`${this.apiUrl}/empleadores/${idEmpleador}/perfil`, datos, {
      headers: {
        Authorization: 'Bearer ' + this.authService.getToken()
      }
    });
  }

  obtenerAnunciosEmpleador(idEmpleador: number | string): Observable<any[]> {
    // Lista resumida de ofertas para home-employer y perfil de empresa.
    return this.http.get<any[]>(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios`, {
      headers: {
        Authorization: 'Bearer ' + this.authService.getToken()
      }
    });
  }

  crearAnuncioEmpleador(idEmpleador: number | string, datos: any): Observable<any> {
    // Crea una nueva oferta laboral asociada al empleador autenticado.
    return this.http.post(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios`, datos, {
      headers: {
        Authorization: 'Bearer ' + this.authService.getToken()
      }
    });
  }

  obtenerAnunciosPublicos(): Observable<any[]> {
    // Lista publica de ofertas activas para la vista del postulante.
    return this.http.get<any[]>(`${this.apiUrl}/anuncios`);
  }

// Buscar por codigo postal
  getSepomex(): Observable<any[]> {
    return this.http.get<any[]>('assets/sepomex_gto.json');
  }
}
