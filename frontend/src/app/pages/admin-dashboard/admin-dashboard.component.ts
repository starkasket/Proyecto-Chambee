import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';

interface PerfilReportado {
  id_reporte: number;
  motivo: string;
  descripcion: string;
  fecha_reporte: string;
  id_postulante_reportado: string;
  nombre_postulante?: string;
  apellido_paterno_postulante?: string;
  apellido_materno_postulante?: string;
}

interface AnuncioReportado {
  titulo: string;
  razon: string;
}

interface NotificacionReporte {
  mensaje: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  nombreAdmin = 'Administrador';
  
  // Variables para la tabla dinámica de reportes
  perfilesReportados: PerfilReportado[] = [];
  cargandoReportes = true;
  errorReportes = '';

  anunciosReportados: AnuncioReportado[] = [
    { titulo: 'Buscamos perritos calientes', razon: 'Titulo inapropiado' },
    { titulo: 'Estas viendo eso solo', razon: 'Descripcion incorrecta' },
    { titulo: 'Busco wapos infieles', razon: 'Posible fraude' },
    { titulo: 'Eskibiforniteponmi', razon: 'no lo se se me acabo la idea' }
  ];

  notificaciones: NotificacionReporte[] = [
    { mensaje: 'Nuevo reporte sobre anuncio de Mario Sanchez por titulo de publicacion: Venta de fentanilo' },
    { mensaje: 'Nuevo reporte sobre usuario diego velasquez juarez por comentario inapropiado' },
    { mensaje: 'Nuevo reporte sobre anuncio de Abigail Fresa por por comentario inapropiado' },
    { mensaje: 'Nuevo reporte sobre Usuario Alma marcela gozo Rico por nombre inapropiado' },
    { mensaje: 'Nuevo reporte sobre Anuncio de Carla Panini por posible fraude' }
  ];

  postulantes: any[] = [];
  cargandoPostulantes = true;
  errorPostulantes = '';

  constructor(
    private readonly api: ApiService,
    private readonly themeService: ThemeService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const datosUsuario = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (datosUsuario) {
      const usuarioObj = JSON.parse(datosUsuario);
      this.nombreAdmin = usuarioObj.nombre || usuarioObj.name || usuarioObj.username || 'Administrador';
    }

    this.cargarPostulantes();
    this.cargarReportesPerfiles();
  }

  cargarPostulantes() {
    this.cargandoPostulantes = true;
    this.api.obtenerPostulantes().subscribe({
      next: (data) => {
        this.postulantes = data;
        this.cargandoPostulantes = false;
      },
      error: (err) => {
        console.error('Error al cargar postulantes:', err);
        this.errorPostulantes = 'No se pudieron cargar los postulantes.';
        this.cargandoPostulantes = false;
      }
    });
  }

  cargarReportesPerfiles() {
    this.cargandoReportes = true;
    this.errorReportes = '';
    this.api.obtenerReportesPerfiles().subscribe({
      next: (reportes: PerfilReportado[]) => {
        this.perfilesReportados = reportes;
        this.cargandoReportes = false;
      },
      error: (err) => {
        console.error('Error al cargar reportes de perfiles:', err);
        this.errorReportes = 'No se pudieron cargar los reportes de perfiles.';
        this.cargandoReportes = false;
      }
    });
  }

  verPerfilPostulante(id: string) {
    if(id) {
      this.router.navigate(['/perfil-postulante', id]);
    }
  }

  suspenderCuenta(idPostulante: string) {
    console.log('Suspendiendo cuenta con ID:', idPostulante);
    // this.api.suspenderPostulante(idPostulante)...
  }

  eliminarAnuncio(anuncio: AnuncioReportado) {
    console.log('Eliminando anuncio:', anuncio.titulo);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }
}