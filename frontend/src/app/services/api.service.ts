import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) { }

  // --- AYUDANTE PARA HEADERS ---
  private getHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: 'Bearer ' + this.authService.getToken()
      })
    };
  }

  // --- SECCIÓN: AUTENTICACIÓN Y PERFIL ---
  registrarEmpleador(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleadores/registro`, datos);
  }

  registrarPostulante(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/postulantes/registro`, datos);
  }

  getUsuario(): any {
    const user = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    return user ? JSON.parse(user) : null;
  }

  getMiPerfil(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mi-perfil`, this.getHeaders());
  }

  actualizarMiPerfil(datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/mi-perfil`, datos, this.getHeaders());
  }

  actualizarCv(archivoUrl: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/mi-perfil/cv`, { archivo_cv: archivoUrl }, this.getHeaders());
  }

  // --- SECCIÓN: EMPLEADORES ---
  obtenerPerfilEmpleador(idEmpleador: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/empleadores/${idEmpleador}/perfil`, this.getHeaders());
  }

  actualizarPerfilEmpleador(idEmpleador: number | string, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/empleadores/${idEmpleador}/perfil`, datos, this.getHeaders());
  }

  obtenerAnunciosEmpleador(idEmpleador: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios`, this.getHeaders());
  }

  crearAnuncioEmpleador(idEmpleador: number | string, datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios`, datos, this.getHeaders());
  }

  // --- SECCIÓN: ANUNCIOS PÚBLICOS (POSTULANTES) ---
  obtenerAnunciosPublicos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/anuncios`);
  }

  // NUEVO: Obtener un solo anuncio por ID (Mucho más eficiente)
  obtenerAnuncioPorId(idAnuncio: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/anuncios/${idAnuncio}`);
  }

  // NUEVO: Postularse a una vacante
  postularAAnuncio(idAnuncio: number | string): Observable<any> {
    // Normalmente enviamos un objeto vacío o datos extra, el backend saca el ID del postulante del Token
    return this.http.post(`${this.apiUrl}/anuncios/${idAnuncio}/postular`, {}, this.getHeaders());
  }

  // --- SECCIÓN: UTILIDADES ---
  getSepomex(): Observable<any[]> {
    return this.http.get<any[]>('assets/sepomex_gto.json');
  }
}