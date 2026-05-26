import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Service {
  id?: string;
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
  esBorrador?: boolean;
  autorId?: string;
  fechaCreacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiciosService {

  private readonly STORAGE_KEY = 'chambee_servicios_v3';
  private serviciosSource = new BehaviorSubject<Service[]>([]);
  servicios$ = this.serviciosSource.asObservable();

  constructor() {
    console.log('[ServiciosService] Servicio inicializado');
    this.cargarServicios();
  }

  // Lee siempre directo de localStorage — fuente de verdad
  private leerDeStorage(): Service[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      console.log('[ServiciosService] Leyendo localStorage key:', this.STORAGE_KEY, '| valor:', raw ? `${raw.length} chars` : 'NULL');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          console.log('[ServiciosService] Servicios encontrados:', parsed.length);
          return parsed;
        }
      }
    } catch (e) {
      console.error('[ServiciosService] Error al leer localStorage:', e);
    }
    return [];
  }

  // Escribe siempre directo a localStorage
  private escribirEnStorage(servicios: Service[]): boolean {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(servicios));
      // Verificación inmediata de que se guardó
      const verificacion = localStorage.getItem(this.STORAGE_KEY);
      const ok = verificacion !== null;
      console.log('[ServiciosService] Guardado en localStorage:', ok ? 'OK' : 'FALLÓ', '| Servicios:', servicios.length);
      return ok;
    } catch (e) {
      console.error('[ServiciosService] Error al escribir en localStorage:', e);
      return false;
    }
  }

  private cargarServicios(): void {
    const serviciosGuardados = this.leerDeStorage();

    if (serviciosGuardados.length > 0) {
      // Hay datos guardados, usarlos directamente
      this.serviciosSource.next(serviciosGuardados);
      return;
    }

    // Primera vez: inicializar con servicios de ejemplo
    console.log('[ServiciosService] Primera carga — inicializando con servicios de ejemplo');
    const serviciosEjemplo: Service[] = [
      {
        id: 'ejemplo-001',
        title: 'Plomería y Reparación de Fugas',
        description: 'Servicio profesional de plomería general, destape de drenajes, reparación de tuberías y fugas de agua urgentes.',
        img: 'https://picsum.photos/80/80?random=101',
        categoria: 'Plomería',
        presupuesto: '$350 MXN',
        ubicacion: 'Centro, Guanajuato, Gto',
        modalidad: 'Presencial',
        urgencia: 'Urgente',
        esBorrador: false,
        autorId: 'sistema',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ejemplo-002',
        title: 'Instalaciones Eléctricas Residenciales',
        description: 'Instalación de iluminación LED, reparación de cortocircuitos, cableado estructurado e instalación de tableros de control seguros.',
        img: 'https://picsum.photos/80/80?random=102',
        categoria: 'Electricidad',
        presupuesto: '$500 MXN',
        ubicacion: 'Marfil, Guanajuato, Gto',
        modalidad: 'Presencial',
        urgencia: 'Normal',
        esBorrador: false,
        autorId: 'sistema',
        fechaCreacion: new Date().toISOString()
      },
      {
        id: 'ejemplo-003',
        title: 'Limpieza y Sanitización Profesional',
        description: 'Limpieza profunda para casas, departamentos y oficinas. Lavado de alfombras, vidrios y sanitización integral de áreas comunes.',
        img: 'https://picsum.photos/80/80?random=103',
        categoria: 'Limpieza',
        presupuesto: '$280 MXN',
        ubicacion: 'San Javier, Guanajuato, Gto',
        modalidad: 'Presencial',
        urgencia: 'Normal',
        esBorrador: false,
        autorId: 'sistema',
        fechaCreacion: new Date().toISOString()
      }
    ];

    this.escribirEnStorage(serviciosEjemplo);
    this.serviciosSource.next(serviciosEjemplo);
  }

  agregarServicio(nuevoServicio: Service): void {
    // Generar ID único
    if (!nuevoServicio.id) {
      nuevoServicio.id = `srv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }
    if (!nuevoServicio.img) {
      nuevoServicio.img = `https://picsum.photos/80/80?random=${Math.floor(Math.random() * 900) + 100}`;
    }
    if (!nuevoServicio.fechaCreacion) {
      nuevoServicio.fechaCreacion = new Date().toISOString();
    }

    // SIEMPRE leer el estado más reciente desde localStorage (no del BehaviorSubject)
    const actuales = this.leerDeStorage();
    const nuevos = [nuevoServicio, ...actuales];

    // Guardar PRIMERO en localStorage
    const guardadoOk = this.escribirEnStorage(nuevos);
    
    if (guardadoOk) {
      // Solo si el guardado fue exitoso, actualizar el estado en memoria
      this.serviciosSource.next(nuevos);
      console.log('[ServiciosService] Servicio agregado y persistido. Total:', nuevos.length);
    } else {
      console.error('[ServiciosService] No se pudo guardar el servicio en localStorage');
    }
  }

  // Fuerza una re-lectura desde localStorage y actualiza el stream
  recargarDesdeStorage(): void {
    console.log('[ServiciosService] Recargando desde localStorage...');
    const servicios = this.leerDeStorage();
    if (servicios.length > 0) {
      this.serviciosSource.next(servicios);
    } else {
      // Si localStorage está vacío (fue borrado externamente), reinicializar
      this.cargarServicios();
    }
  }

  obtenerServiciosPorAutor(autorId: string): Service[] {
    return this.leerDeStorage().filter(s => s.autorId === autorId);
  }

  // Expone todos los servicios actuales de forma síncrona
  obtenerTodos(): Service[] {
    return this.leerDeStorage();
  }
}