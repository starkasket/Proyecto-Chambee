import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

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
  id_reporte: number;
  id_anuncio: string;
  titulo: string;
  razon: string;
  descripcion: string;
  fecha_reporte: string;
  empresa?: string;
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
  isMobile = false;
   servicesOpen = false;

   menuOpen = false;
  notificationsOpen = false;
  
  // Variables para reportes de perfiles
  perfilesReportados: PerfilReportado[] = [];
  cargandoReportes = true;
  errorReportes = '';

  // Variables para reportes de anuncios
  anunciosReportados: AnuncioReportado[] = [];
  cargandoReportesAnuncios = true;
  errorReportesAnuncios = '';

  // Variables para postulantes
  postulantes: any[] = [];
  cargandoPostulantes = true;
  errorPostulantes = '';

  // Variables para empresas
  empresas: any[] = [];
  cargandoEmpresas = true;
  errorEmpresas = '';

  notificaciones: NotificacionReporte[] = [
    { mensaje: 'Nuevo reporte sobre anuncio de Mario Sanchez por titulo de publicacion: Venta de fentanilo' },
    { mensaje: 'Nuevo reporte sobre usuario diego velasquez juarez por comentario inapropiado' },
    { mensaje: 'Nuevo reporte sobre anuncio de Abigail Fresa por por comentario inapropiado' },
    { mensaje: 'Nuevo reporte sobre Usuario Alma marcela gozo Rico por nombre inapropiado' },
    { mensaje: 'Nuevo reporte sobre Anuncio de Carla Panini por posible fraude' }
  ];

  constructor(
    private readonly api: ApiService,
    private readonly themeService: ThemeService,
    private readonly router: Router,
    private readonly authApi: AuthService
  ) {}

  ngOnInit(): void {
    const datosUsuario = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (datosUsuario) {
      const usuarioObj = JSON.parse(datosUsuario);
      this.nombreAdmin = usuarioObj.nombre || usuarioObj.name || usuarioObj.username || 'Administrador';
    }

    this.cargarPostulantes();
    this.cargarReportesPerfiles();
    this.cargarReportesAnuncios();
    this.cargarEmpresas();
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

  cargarEmpresas() {
    this.cargandoEmpresas = true;
    this.errorEmpresas = '';
    this.api.obtenerEmpleadores().subscribe({
      next: (data) => {
        this.empresas = data;
        this.cargandoEmpresas = false;
      },
      error: (err) => {
        console.error('Error al cargar empresas:', err);
        this.errorEmpresas = 'No se pudieron cargar las empresas.';
        this.cargandoEmpresas = false;
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

  cargarReportesAnuncios() {
    this.cargandoReportesAnuncios = true;
    this.errorReportesAnuncios = '';
    
    // Aquí llamas al método de tu API que trae los reportes de vacantes
    // Asegúrate de tener este método creado en api.service.ts
    // Si aún no lo tienes, este código capturará el error sin romper la app.
    if (this.api['obtenerReportesAnuncios']) {
      (this.api as any).obtenerReportesAnuncios().subscribe({
        next: (reportes: AnuncioReportado[]) => {
          this.anunciosReportados = reportes;
          this.cargandoReportesAnuncios = false;
        },
        error: (err: any) => {
          console.error('Error al cargar reportes de anuncios:', err);
          this.errorReportesAnuncios = 'No se pudieron cargar los reportes de anuncios.';
          this.cargandoReportesAnuncios = false;
        }
      });
    } else {
      // Mock de datos temporal mientras configuras tu backend
      setTimeout(() => {
        this.anunciosReportados = [
          { id_reporte: 1, id_anuncio: '101', titulo: 'Buscamos perritos calientes', razon: 'Titulo inapropiado', descripcion: 'El título no parece un empleo real.', fecha_reporte: new Date().toISOString() },
          { id_reporte: 2, id_anuncio: '102', titulo: 'Estas viendo eso solo', razon: 'Descripcion incorrecta', descripcion: 'Faltas de respeto en la descripción.', fecha_reporte: new Date().toISOString() },
          { id_reporte: 3, id_anuncio: '103', titulo: 'Busco wapos infieles', razon: 'Posible fraude', descripcion: 'Piden dinero por WhatsApp.', fecha_reporte: new Date().toISOString() }
        ];
        this.cargandoReportesAnuncios = false;
      }, 1000);
    }
  }

  verPerfilPostulante(id: string) {
    if(id) {
      this.router.navigate(['/perfil-postulante', id]);
    }
  }

  verPerfilEmpresa(id: string) {
    if(id) {
      this.router.navigate(['/empresa', id]);
    }
  }

  suspenderCuenta(idPostulante: string) {
    if (confirm('¿Estás seguro de que deseas suspender esta cuenta?')) {
      console.log('Suspendiendo cuenta con ID:', idPostulante);
      // this.api.suspenderPostulante(idPostulante).subscribe(...)
    }
  }

  toggleMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }


  
  logout() {
    this.authApi.logout();
    this.menuOpen = false;
    this.servicesOpen = false;
  }

  verAnuncio(idAnuncio: string) {
    if(idAnuncio) {
      this.router.navigate(['/job', idAnuncio]);
    }
  }

  eliminarAnuncio(idAnuncio: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este anuncio permanentemente por incumplimiento de normas?')) {
      console.log('Eliminando anuncio con ID:', idAnuncio);
      // Aquí conectas tu API: this.api.eliminarAnuncio(idAnuncio).subscribe(...)
      
      // Simulación de eliminación local en la vista
      this.anunciosReportados = this.anunciosReportados.filter(a => a.id_anuncio !== idAnuncio);
      alert('Anuncio eliminado con éxito.');
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }
}