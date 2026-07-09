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
    const user = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');
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

   eliminarEmpleador(){
    return this.http.delete(`${this.apiUrl}/empleadores/eliminar-cuenta`, this.getHeaders());
  }

  obtenerAnunciosEmpleador(idEmpleador: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleadores/${idEmpleador}/anuncios`, this.getHeaders());
  }

  obtenerPostulacionesEmpleador(idEmpleador: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/empleadores/${idEmpleador}/postulaciones`, this.getHeaders());
  }

  obtenerPostulantes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/postulantes`, this.getHeaders());
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

  obtenerPerfilPublicoEmpresa(idEmpleador: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/empresas/${idEmpleador}/perfil-publico`, this.getHeaders());
  }

  postularAAnuncio(idAnuncio: number | string): Observable<any> {
    return this.http.post(`${this.apiUrl}/anuncios/${idAnuncio}/postular`, {}, this.getHeaders());
  }

  obtenerFavoritos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/favoritos`, this.getHeaders());
  }

  revisarFavorito(idAnuncio: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/anuncios/${idAnuncio}/favorito`, this.getHeaders());
  }

  guardarFavorito(idAnuncio: number | string): Observable<any> {
    return this.http.post(`${this.apiUrl}/anuncios/${idAnuncio}/favoritos`, {}, this.getHeaders());
  }

  eliminarFavorito(idAnuncio: number | string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/anuncios/${idAnuncio}/favoritos`, this.getHeaders());
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

  obtenerPerfilPostulante(idPostulante: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/postulantes/${idPostulante}`, this.getHeaders());
  }

  obtenerPostulacionesPostulante(idPostulante: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/postulantes/${idPostulante}/postulaciones`, this.getHeaders());
  }

  eliminarPostulante(){
    return this.http.delete(`${this.apiUrl}/postulantes/eliminar-cuenta`, this.getHeaders());
  }

  calificarPostulante(idPostulante: string, puntuacion: number, comentario?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/postulantes/${idPostulante}/valoracion`, { puntuacion, comentario }, this.getHeaders());
  }

  calificarEmpleador(idEmpleador: string, puntuacion: number, comentario?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/empleadores/${idEmpleador}/valoracion`, { puntuacion, comentario }, this.getHeaders());
  }

  eliminarValoracion(idValoracion: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/valoraciones/${idValoracion}`, this.getHeaders());
  }

  getSepomex(): Observable<any[]> {
    return this.http.get<any[]>('assets/sepomex_gto.json');
  }

  // ── Servicios (oficios) ──────────────────────────────────────
  crearServicio(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/servicios`, datos, this.getHeaders());
  }

  obtenerMisServicios(autorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/servicios/${autorId}`, this.getHeaders());
  }

  obtenerServiciosPublicos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/servicios-publicos`);
  }

  obtenerServicioDetalle(idServicio: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/servicio-detalle/${idServicio}`);
  }

  eliminarServicio(idServicio: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/servicios/${idServicio}`, this.getHeaders());
  }

  publicarServicio(idServicio: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/servicios/${idServicio}/publicar`,
      {},
      this.getHeaders()
    );
  }

  toggleVisibilidadCv(visible_empresas: boolean): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/mi-perfil/cv/visibilidad`,
      { visible_empresas },
      this.getHeaders()
    );
  }
  
  obtenerComentariosAnuncio(idAnuncio: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/comentarios/${idAnuncio}`);
  }

  agregarComentario(idAnuncio: string, idPostulante: string, texto: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/comentarios`, {
      id_anuncio: idAnuncio,
      id_postulante: idPostulante,
      texto: texto
    }, this.getHeaders());
  }

  editarComentario(idComentario: string, idPostulante: string, texto: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/comentarios/${idComentario}`, {
      id_postulante: idPostulante,
      texto: texto
    }, this.getHeaders());
  }

  eliminarComentario(idComentario: string, idPostulante: string): Observable<any> {
    const options = {
      headers: this.getHeaders().headers,
      body: { id_postulante: idPostulante }
    };
    return this.http.delete<any>(`${this.apiUrl}/comentarios/${idComentario}`, options);
  }
  
  aceptarPostulante(idPostulante: string) {
    return this.http.patch(`${this.apiUrl}/empleadores/postulantes/${idPostulante}/aceptar`, {}, this.getHeaders());
  }

  crearReporte(reporte: any){
     return this.http.post(`${this.apiUrl}/reportes`, reporte, this.getHeaders());
  }

  crearReporteEmpleador(reporte: any) {
    return this.http.post(`${this.apiUrl}/reportes/empleador`,reporte, this.getHeaders());
  }

  // ===== NUEVO: OBTENER REPORTES DE PERFILES =====
  obtenerReportesPerfiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reportes/perfiles`, this.getHeaders());
  }

  // ===== NOTIFICACIONES =====
  obtenerNotificaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notificaciones`, this.getHeaders());
  }

  marcarNotificacionesLeidas(): Observable<any> {
    return this.http.put(`${this.apiUrl}/notificaciones/marcar-leidas`, {}, this.getHeaders());
  }
}