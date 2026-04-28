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

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: 'Bearer ' + this.authService.getToken()
      })
    };
  }

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

  obtenerPerfilEmpleador(idEmpleador: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/empleadores/${idEmpleador}/perfil`, this.getHeaders());
  }

  actualizarPerfilEmpleador(idEmpleador: number | string, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/empleadores/${idEmpleador}/perfil`, datos, this.getHeaders());
  }

  obtenerAnunciosEmpleador(idEmpleador: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios`, this.getHeaders());
  }

  obtenerAnuncioEmpleador(idEmpleador: number | string, idAnuncio: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios/${idAnuncio}`, this.getHeaders());
  }

  crearAnuncioEmpleador(idEmpleador: number | string, datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios`, datos, this.getHeaders());
  }

  actualizarAnuncioEmpleador(idEmpleador: number | string, idAnuncio: number | string, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios/${idAnuncio}`, datos, this.getHeaders());
  }

  actualizarEstadoAnuncioEmpleador(idEmpleador: number | string, idAnuncio: number | string, estado_anuncio: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios/${idAnuncio}/estado`, { estado_anuncio }, this.getHeaders());
  }

  obtenerAnunciosPublicos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/anuncios`);
  }

  obtenerAnuncioPorId(idAnuncio: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/anuncios/${idAnuncio}`);
  }

  postularAAnuncio(idAnuncio: number | string): Observable<any> {
    return this.http.post(`${this.apiUrl}/anuncios/${idAnuncio}/postular`, {}, this.getHeaders());
  }

  obtenerCategorias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorias`);
  }

  obtenerMisEtiquetas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mi-etiquetas`, this.getHeaders());
  }

  guardarMisEtiquetas(etiquetas: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/mi-etiquetas`, { etiquetas }, this.getHeaders());
  }

  getSepomex(): Observable<any[]> {
    return this.http.get<any[]>('assets/sepomex_gto.json');
  }
}
