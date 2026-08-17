import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
  suspendido?: boolean;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  nombreAdmin = 'Administrador';
  isMobile = false;
  servicesOpen = false;

  menuOpen = false;
  notificationsOpen = false;

  // --- Búsqueda de empleos/servicios ---
  searchTerm = '';
  searchSubject = new Subject<string>();
  searchResults: any[] = [];
  showSearchDropdown = false;
  recentSearches: string[] = [];

  // Variables para reportes de perfiles
  perfilesReportados: PerfilReportado[] = [];
  cargandoReportes = true;
  errorReportes = '';

  anunciosReportados: AnuncioReportado[] = [];
  cargandoReportesAnuncios = true;
  errorReportesAnuncios = '';

  postulantes: any[] = [];
  cargandoPostulantes = true;
  errorPostulantes = '';

  empresas: any[] = [];
  cargandoEmpresas = true;
  errorEmpresas = '';

  // Control de modales de error
  mostrarModalError: boolean = false;
  mensajeModalError: string = '';

  // Control de modales de eliminar REPORTE
  mostrarModalEliminarReporte: boolean = false;
  reporteAEliminar: number | null = null;

  // Control de modales de eliminación de ANUNCIO
  mostrarModalEliminarAnuncio: boolean = false;
  mostrarModalExitoEliminar: boolean = false; 
  anuncioAEliminar: string | null = null;
  mensajeModalEliminar: string = '¿Estás seguro de que deseas eliminar este anuncio permanentemente por incumplimiento de normas?';

  // Control de modales de suspensión de cuenta
  mostrarModalSuspender: boolean = false;
  mostrarModalExitoSuspension: boolean = false;
  cuentaASuspender: string | null = null;
  tiempoSuspension: string = '7'; // Valor por defecto: 1 semana

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
    this.cargarBusquedasRecientes();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.ejecutarBusqueda(query);
    });
  }

  // --- BÚSQUEDA EN VIVO ---
  onSearchInput(value: string) {
    this.showSearchDropdown = true;
    if (value && value.trim().length > 0) {
      this.searchSubject.next(value);
    } else {
      this.searchResults = [];
    }
  }

  ejecutarBusqueda(query: string) {
    const filtrosVacios = {
      tipo: '', ciudad: '', ordenar: 'fecha',
      categoriaEmpleo: '', modalidad: '', categoriaServicio: '', cobertura: ''
    };
    this.api.buscar(query, filtrosVacios).subscribe({
      next: (resultados: any[]) => {
        this.searchResults = (resultados || []).slice(0, 6);
      },
      error: () => {
        this.searchResults = [];
      }
    });
  }

  cerrarBuscador() {
    setTimeout(() => {
      this.showSearchDropdown = false;
    }, 200);
  }

  irAResultado(resultado: any) {
    const titleToSave = resultado.title || resultado.titulo || resultado.categoria || '';
    this.guardarBusquedaReciente(this.searchTerm || titleToSave);
    this.showSearchDropdown = false;
    this.searchTerm = '';

    if (resultado.tipo === 'empleo') {
      const id = resultado.id_anuncio || resultado.id;
      this.router.navigate(['/job', id]);
    } else {
      const id = resultado.id_servicio || resultado.id;
      this.router.navigate(['/search'], { queryParams: { q: resultado.titulo || resultado.title } });
    }
  }

  cargarBusquedasRecientes() {
    const stored = localStorage.getItem('chambee_busquedas_recientes');
    if (stored) {
      try {
        this.recentSearches = JSON.parse(stored);
      } catch {
        this.recentSearches = [];
      }
    }
  }

  guardarBusquedaReciente(term: string) {
    if (!term || term.trim() === '') return;
    let searches = [...this.recentSearches];
    searches = searches.filter(t => this.normalizarTexto(t) !== this.normalizarTexto(term));
    searches.unshift(term);
    if (searches.length > 4) searches = searches.slice(0, 4);
    this.recentSearches = searches;
    localStorage.setItem('chambee_busquedas_recientes', JSON.stringify(searches));
  }

  seleccionarBusquedaReciente(term: string) {
    this.searchTerm = term;
    this.showSearchDropdown = false;
    this.router.navigate(['/search'], { queryParams: { q: term } });
  }

  buscarEmpleos() {
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      this.guardarBusquedaReciente(this.searchTerm);
      this.showSearchDropdown = false;
      this.router.navigate(['/search'], { queryParams: { q: this.searchTerm } });
    }
  }

  highlightText(text: string | null | undefined, query: string): string {
    if (!text) return '';
    if (!query) return text;
    const safeQuery = query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return text.replace(regex, '<span class="text-highlight">$1</span>');
  }

  private normalizarTexto(value: unknown): string {
    return String(value ?? '').toLowerCase().trim();
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
        this.perfilesReportados = reportes.map(r => ({...r, suspendido: r.suspendido || false}));
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
    
    if (this.api.obtenerReportesAnuncios) {
      this.api.obtenerReportesAnuncios().subscribe({
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

  // --- MODAL DE ERROR GENÉRICO ---
  abrirModalError(mensaje: string) {
    this.mensajeModalError = mensaje;
    this.mostrarModalError = true;
  }

  cerrarModalError() {
    this.mostrarModalError = false;
    this.mensajeModalError = '';
  }

  // --- MÉTODOS PARA MODALES DE SUSPENDER CUENTA ---
  abrirModalSuspender(idPostulante: string) {
    this.cuentaASuspender = idPostulante;
    this.tiempoSuspension = '7'; 
    this.mostrarModalSuspender = true;
  }

  cerrarModalSuspender() {
    this.mostrarModalSuspender = false;
    this.cuentaASuspender = null;
  }

  cerrarModalExitoSuspension() {
    this.mostrarModalExitoSuspension = false;
  }

  ejecutarSuspension() {
    if (!this.cuentaASuspender) return;

    const idPostulante = this.cuentaASuspender;
    const diasSuspension = parseInt(this.tiempoSuspension, 10);

    this.api.suspenderUsuario(idPostulante, diasSuspension).subscribe({
      next: (res) => {
        this.perfilesReportados.forEach(p => {
          if (p.id_postulante_reportado === idPostulante) {
            p.suspendido = true;
          }
        });
        this.cerrarModalSuspender();
        this.mostrarModalExitoSuspension = true;
      },
      error: (err) => {
        console.error('Error al suspender cuenta:', err);
        this.cerrarModalSuspender();
        this.abrirModalError('Hubo un problema al suspender al usuario. Intenta más tarde.');
      }
    });
  }

  // --- FUNCIÓN PARA ELIMINAR EL REPORTE DE LA LISTA Y DE LA BD ---
  confirmarEliminarReporte(idReporte: number) {
    this.reporteAEliminar = idReporte;
    this.mostrarModalEliminarReporte = true;
  }

  cerrarModalEliminarReporte() {
    this.mostrarModalEliminarReporte = false;
    this.reporteAEliminar = null;
  }

  ejecutarEliminarReporte() {
    if (this.reporteAEliminar === null) return;
    const idReporte = this.reporteAEliminar;

    this.api.eliminarReporte(idReporte).subscribe({
      next: () => {
        this.perfilesReportados = this.perfilesReportados.filter(p => p.id_reporte !== idReporte);
        this.cerrarModalEliminarReporte();
      },
      error: (err) => {
        console.error('Error al eliminar el reporte:', err);
        this.cerrarModalEliminarReporte();
        this.abrirModalError('Hubo un error al intentar eliminar el reporte. Revisa la conexión.');
      }
    });
  }

  toggleMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.notificationsOpen) this.notificationsOpen = false;
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

  // --- MÉTODOS PARA MODALES DE ELIMINAR ANUNCIO ---
  confirmarEliminarAnuncio(idAnuncio: string) {
    this.anuncioAEliminar = idAnuncio;
    this.mostrarModalEliminarAnuncio = true;
  }

  cerrarModalEliminarAnuncio() {
    this.mostrarModalEliminarAnuncio = false;
    this.anuncioAEliminar = null;
  }

  cerrarModalExitoEliminar() {
    this.mostrarModalExitoEliminar = false;
  }

  ejecutarEliminarAnuncio() {
    if (!this.anuncioAEliminar) return;

    const idAnuncio = this.anuncioAEliminar;
    
    this.api.eliminarAnuncio(idAnuncio).subscribe({
      next: (res) => {
        this.anunciosReportados = this.anunciosReportados.filter(a => a.id_anuncio !== idAnuncio);
        this.cerrarModalEliminarAnuncio();
        this.mostrarModalExitoEliminar = true;
      },
      error: (err) => {
        console.error('Error al intentar eliminar el anuncio:', err);
        this.cerrarModalEliminarAnuncio();
        this.abrirModalError('Hubo un problema al eliminar el anuncio de la base de datos. Por favor, intenta más tarde.');
      }
    });
  }
  // --------------------------------------------------

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }
}