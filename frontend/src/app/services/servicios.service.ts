import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Service {
  id_servicio?: string; // ID que viene de PostgreSQL
  id?: string; // Fallback por si acaso
  title: string;
  description: string;
  img?: string;
  categoria?: string;
  presupuesto?: string;
  ubicacion?: string;
  estado?: string;
  ciudad?: string;
  colonia?: string;
  calle?: string;
  codigo_postal?: string;
  modalidad?: string;
  urgencia?: string;
  es_borrador?: boolean;
  autor_id?: string;
  fecha_creacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiciosService {

  private apiUrl = 'http://localhost:3000/servicios'; // Ruta de tu backend
  private serviciosSource = new BehaviorSubject<Service[]>([]);
  servicios$ = this.serviciosSource.asObservable();

  constructor(private http: HttpClient) {
    console.log('[ServiciosService] Servicio inicializado, conectando a BD...');
    // Carga inicial de los servicios públicos al arrancar
    this.cargarServiciosPublicos();
  }

  // Extrae el token de la sesión para los permisos del backend
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); 
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // GET: Obtiene todos los servicios directamente de PostgreSQL
  cargarServiciosPublicos(): void {
    this.http.get<Service[]>('http://localhost:3000/servicios-publicos').subscribe({
      next: (servicios) => {
        console.log('[ServiciosService] Servicios cargados desde PostgreSQL:', servicios.length);
        this.serviciosSource.next(servicios);
      },
      error: (err) => {
        console.error('[ServiciosService] Error al cargar servicios de la BD:', err);
      }
    });
  }

  // GET: Obtiene un servicio específico por su ID
  obtenerServicioPorId(id: string): Observable<Service> {
    return this.http.get<Service>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // POST: Guarda un nuevo servicio en PostgreSQL
  agregarServicio(nuevoServicio: Service): Observable<Service> {
    return this.http.post<Service>(this.apiUrl, nuevoServicio, { headers: this.getHeaders() }).pipe(
      tap((servicioCreado) => {
        const actuales = this.serviciosSource.value;
        this.serviciosSource.next([servicioCreado, ...actuales]);
        console.log('[ServiciosService] Servicio guardado en BD exitosamente');
      })
    );
  }

  // PUT: Actualiza un servicio en PostgreSQL
  actualizarServicio(id: string, datosActualizados: Service): Observable<Service> {
    return this.http.put<Service>(`${this.apiUrl}/${id}`, datosActualizados, { headers: this.getHeaders() }).pipe(
      tap((servicioEditado) => {
        // Actualizamos la lista de la pantalla en tiempo real
        const actuales = this.serviciosSource.value;
        const index = actuales.findIndex(s => (s.id_servicio || s.id) === id);
        
        if (index !== -1) {
          actuales[index] = { ...actuales[index], ...datosActualizados };
          this.serviciosSource.next([...actuales]);
        }
        console.log('[ServiciosService] Servicio actualizado en BD');
      })
    );
  }

  // DELETE: Borra el servicio de PostgreSQL
  eliminarServicio(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(() => {
        // Actualizamos la lista local automáticamente
        const actuales = this.serviciosSource.value;
        this.serviciosSource.next(actuales.filter(s => (s.id_servicio || s.id) !== id));
        console.log('[ServiciosService] Servicio eliminado de la BD');
      })
    );
  }

  // GET: Obtiene los servicios de un autor específico
  obtenerServiciosPorAutor(autorId: string): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/${autorId}`, { headers: this.getHeaders() });
  }
}