import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { CarouselComponent } from '../../components/carousel/carousel.component';
import { MapaUbicacionComponent } from '../../components/mapa-ubicacion/mapa-ubicacion.component';
import { NotificacionService, NotificationItem } from '../../services/notificacion.service';

interface Slide {
  id?: string | number;
  company: string;
  companyDescription: string;
  title: string;
  salary: string;
  location: string;
  mode: string;
  urgency?: string;
  description: string;
  img: string;
  tags: string[];
  matchScore: number;
}

interface Job {
  id?: string | number;
  company: string;
  title: string;
  salary: string;
  salaryRaw?: number;
  moneda?: string;
  periodoPago?: string;
  img: string;
  images?: string[];
  urgency?: string;
  rating: string;
  applicants: number;
  tags: string[];
  matchScore: number;
  tipoAnuncio?: string;
  modalidad?: string;
  distanciaKm?: number;
  estado: string;
}

/* interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  anuncioId?: string | number;
} */

@Component({
  selector: 'app-home-user',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CarouselComponent, MapaUbicacionComponent],
  templateUrl: './home-user.component.html',
  styleUrl: './home-user.component.css'
})
export class HomeUserComponent implements OnInit, OnDestroy {
  nombre_postulante = 'Usuario';
  foto_perfil = '';
  etiquetasInteres: string[] = [];
  servicesOpen = false;
  menuOpen = false;
  notificationsOpen = false;

  notifications: NotificationItem[] = [];
  hasUnreadNotifications = false;

  // hasUnreadNotifications = false;

  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 8;
  isMobile = false;
  faqOpen: number | null = null;
  modalMensaje = '';
  menuServicioAbierto: number | null = null;
  favoriteJobIds = new Set<string>();
  savingFavoriteId: string | null = null;

  servicioDetalle: any = null;
  servicioDetalleOpen = false;
  servicioDetalleCargando = false;

  usuarioActualId: string | null = null;

  private latitudUsuario: number | null = null;
  private longitudUsuario: number | null = null;

  searchTerm = '';
  searchSubject = new Subject<string>();
  searchResults: any[] = [];
  showSearchDropdown = false;
  recentSearches: string[] = [];

  // --- PANEL ÚNICO DE FILTROS ---
  mostrarFiltros: boolean = false;
  filtros = {
    modalidad: '',
    ciudad: '',
    categoriaEmpleo: '',
    categoriaServicio: '',
    cobertura: '',
    distancia: '',
    ordenar: 'fecha',
    moneda: '',
    salarioMin: null as number | null,
    salarioMax: null as number | null
  };

  readonly tasasCambio: { [key: string]: number } = {
    'MXN': 1,
    'USD': 20.0,
    'EUR': 21.5
  };

  categoriasDisponibles: string[] = [];

  ciudades: string[] = [
    'Abasolo', 'Acámbaro', 'Apaseo el Alto', 'Apaseo el Grande', 'Atarjea',
    'Celaya', 'Comonfort', 'Coroneo', 'Cortazar', 'Doctor Mora',
    'Dolores Hidalgo C.I.N.', 'Guanajuato', 'Huanímaro', 'Irapuato',
    'Jaral del Progreso', 'Jerécuaro', 'León', 'Manuel Doblado', 'Moroleón',
    'Ocampo', 'Pénjamo', 'Pueblo Nuevo', 'Purísima del Rincón', 'Romita',
    'Salamanca', 'Salvatierra', 'San Diego de la Unión', 'San Felipe',
    'San Francisco del Rincón', 'San José Iturbide', 'San Luis de la Paz',
    'San Miguel de Allende', 'Santa Catarina', 'Santa Cruz de Juventino Rosas',
    'Santiago Maravatío', 'Silao de la Victoria', 'Tarandacuao', 'Tarimoro',
    'Tierra Blanca', 'Uriangato', 'Valle de Santiago', 'Victoria',
    'Villagrán', 'Xichú', 'Yuriria'
  ];

  private categoriasPreDefinidas: string[] = [
    'Administración / Oficina', 'Agricultura / Ganadería', 'Atención al cliente',
    'Construcción / Obra', 'Diseño', 'Educación / Docencia', 'Finanzas / Contabilidad',
    'Ingeniería', 'Legal / Derecho', 'Logística / Transporte', 'Manufactura / Producción',
    'Marketing / Publicidad', 'Recursos Humanos', 'Restaurantes / Gastronomía',
    'Salud / Medicina', 'Seguridad / Vigilancia', 'Servicios de limpieza',
    'Servicios técnicos / Mantenimiento', 'Tecnología / TI', 'Turismo / Hotelería', 'Ventas'
  ];

  private slideIntervalId?: ReturnType<typeof setInterval>;

  // notifications: NotificationItem[] = [];
  slides: Slide[] = [];
  jobs: Job[] = [];
  services: any[] = [];
  vistosRecientemente: Job[] = [];

  constructor(
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private readonly http: HttpClient,
    private readonly api: ApiService,
    private readonly authApi: AuthService,
    private readonly socketService: SocketService,
    private cdr: ChangeDetectorRef,
    private readonly notificationService: NotificacionService
  ) { }

  ngOnInit() {
    this.notificationService.cargarNotificaciones();

    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);



    this.checkMobile();

    this.cargarFavoritosGuardados();
    this.cargarBusquedasRecientes();

    const usuario = this.api.getUsuario();
    if (usuario?.id) {

      this.notificationService.notifications$
        .subscribe((notifications) => {
          this.notifications = notifications;
        });

      this.notificationService.hasUnreadNotifications$
        .subscribe((hasUnread) => {
          this.hasUnreadNotifications = hasUnread;
        });
      this.socketService.conectarUsuario(usuario.id);

      this.socketService.escucharRespuestasPostulante().subscribe((datosAlerta) => {
        this.agregarNotificacion(datosAlerta);
      });

      this.socketService.escucharRechazosPostulante().subscribe((datosAlerta) => {
        this.agregarNotificacion(datosAlerta);
      });

      this.socketService.escucharAnunciosCercanos().subscribe((datosAlerta) => {
        this.agregarNotificacion(datosAlerta);
      });


      this.api.getMiPerfil().subscribe({
        next: (perfil: any) => {
          this.nombre_postulante = perfil?.nombre_postulante || 'Usuario';
          this.foto_perfil = perfil?.foto_perfil || '';
          this.latitudUsuario = perfil?.latitud != null ? Number(perfil.latitud) : null;

          this.longitudUsuario = perfil?.longitud != null ? Number(perfil.longitud) : null;

          this.cargarOfertasPublicas();
        },
        error: () => {
          this.nombre_postulante = usuario?.nombre || 'Usuario';
        }
      });
    } else {
      this.cargarOfertasPublicas();
    }

    this.api.obtenerServiciosPublicos().subscribe({
      next: (servicios) => {
        this.services = servicios || [];
      },
      error: () => {
        this.services = [];
      }
    });

    this.usuarioActualId = usuario?.id ? String(usuario.id) : null;

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.ejecutarBusqueda(query);
    });
  }

  private calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;

    const dLat = this.gradosARadianes(lat2 - lat1);
    const dLon = this.gradosARadianes(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(this.gradosARadianes(lat1)) *
      Math.cos(this.gradosARadianes(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private gradosARadianes(grados: number): number {
    return grados * Math.PI / 180;
  }

  ngOnDestroy() {
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
    }
  }

  /*  cargarNotificaciones() {
     this.api.obtenerNotificaciones().subscribe({
       next: (notifs) => {
         this.notifications = notifs.map(n => ({
           id: n.id,
           title: n.title,
           message: n.message,
           time: new Date(n.time).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
           read: n.read,
           anuncioId: n.anuncioId
         }));
         this.hasUnreadNotifications = this.notifications.some(n => !n.read);
       },
       error: (err) => console.error('Error al obtener notificaciones', err)
     });
   } */

  toggleNotifications(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen = !this.notificationsOpen;

    if (this.notificationsOpen && this.hasUnreadNotifications) {
      this.notificationService.marcarTodasComoLeidas();
    }
    this.menuOpen = false;
  }

  /*  agregarNotificacion(datos: any) {
     const nuevaNotificacion: NotificationItem = {
       id: Date.now(),
       title: datos.titulo,
       message: datos.mensaje,
       time: 'Hace un momento',
       read: false,
       anuncioId: datos.idAnuncio
     };
 
     this.notifications.unshift(nuevaNotificacion);
     this.hasUnreadNotifications = true;
     this.cdr.detectChanges();
   } */

  /*   onNotificationClick(notif: NotificationItem, event: Event) {
      event.stopPropagation();
      notif.read = true;
      this.notificationsOpen = false;
      this.cdr.detectChanges();
      if (notif.anuncioId) {
  
        this.router.navigate(['/job', notif.anuncioId]);
      }
    } */

  onNotificationClick(notif: NotificationItem, event: Event) {
    event.stopPropagation();
    notif.read = true;
    this.notificationsOpen = false;

    console.log('NOTIFICACIÓN CLICKEADA:', notif);
    console.log('ID ANUNCIO:', notif.idAnuncio);
    console.log('TIPO:', notif.tipo);



    switch (notif.tipo) {

      case 'ANUNCIO_CERCANO':
        if (notif.idAnuncio) {
          this.router.navigate(['/job', notif.idAnuncio]);
        }
        break;

      case 'SEGUIMIENTO_ACEPTADO':
      case 'SEGUIMIENTO_RECHAZADO':
        if (notif.idAnuncio) {
          this.router.navigate(['/job', notif.idAnuncio]);
        }
        break;
    }


    this.cdr.detectChanges();

  }

  private cargarOfertasPublicas() {
    const usuario = this.api.getUsuario();
    const etiquetas$ = usuario?.rol === 'postulante'
      ? this.api.obtenerMisEtiquetas().pipe(catchError(() => of({ etiquetas: [] })))
      : of({ etiquetas: [] });

    forkJoin({
      anuncios: this.api.obtenerAnunciosPublicos(),
      preferencias: etiquetas$
    }).subscribe({
      next: ({ anuncios, preferencias }) => {
        const etiquetas = Array.isArray(preferencias?.etiquetas) ? preferencias.etiquetas : [];
        this.etiquetasInteres = etiquetas;

        if (!anuncios || !anuncios.length) {
          this.slides = [];
          this.jobs = [];
          this.vistosRecientemente = [];
          return;
        }

        const anunciosOrdenados = [...anuncios]
          .map((anuncio, index) => {
            let distanciaKm: number | null = null;

            const latAnuncio = anuncio.latitud != null ? Number(anuncio.latitud) : null;

            const lonAnuncio = anuncio.longitud != null ? Number(anuncio.longitud) : null;

            if (this.latitudUsuario != null && this.longitudUsuario != null &&
              latAnuncio != null && lonAnuncio != null && !isNaN(latAnuncio) && !isNaN(lonAnuncio)) {
              distanciaKm = this.calcularDistanciaKm(this.latitudUsuario, this.longitudUsuario, latAnuncio, lonAnuncio);
            }

            return {
              ...anuncio,
              __score: this.calcularMatch(anuncio.categorias || [], etiquetas),
              __distancia: distanciaKm,
              __index: index
            };
          }).sort((a, b) => {
            if (b.__score !== a.__score) {
              return b.__score - a.__score;
            }

            if (a.__distancia != null && b.__distancia != null) {
              return a.__distancia - b.__distancia;
            }

            if (a.__distancia != null) return -1;
            if (b.__distancia != null) return 1;

            return a.__index - b.__index;
          });



        const ofertas = anunciosOrdenados.map((anuncio) => {
          const monedaAnuncio = anuncio.moneda || anuncio.tipo_moneda || 'MXN';
          const periodoAnuncio = anuncio.periodo_pago || anuncio.periodo || 'Mensual';

          return {
            id: anuncio.id_anuncio,
            company: anuncio.nombre_empresa || 'Empresa Confidencial',
            companyDescription: anuncio.descripcion_empresa || 'Empresa activa en Chambee.',
            title: anuncio.titulo,
            salary: this.formatearSalario(anuncio.salario, monedaAnuncio, periodoAnuncio),
            location: `${anuncio.ciudad}, ${anuncio.estado}`,
            mode: anuncio.modalidad,
            urgency: anuncio.urgencia || 'Normal',
            description: anuncio.descripcion,
            img: anuncio.img || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&auto=format&fit=crop&q=60',
            tags: anuncio.categorias || [],
            matchScore: anuncio.__score
          };
        });

        this.slides = ofertas.slice(0, Math.min(5, ofertas.length));

        this.jobs = anunciosOrdenados.map((anuncio) => {
          const monedaAnuncio = anuncio.moneda || anuncio.tipo_moneda || 'MXN';
          const periodoAnuncio = anuncio.periodo_pago || anuncio.periodo || 'Mensual';

          return {
            id: anuncio.id_anuncio,
            company: anuncio.nombre_empresa || 'Empresa Confidencial',
            title: anuncio.titulo,
            salary: this.formatearSalario(anuncio.salario, monedaAnuncio, periodoAnuncio),
            salaryRaw: anuncio.salario ? parseFloat(anuncio.salario) : 0,
            moneda: monedaAnuncio,
            periodoPago: periodoAnuncio,
            img: anuncio.img || 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&auto=format&fit=crop&q=60',
            images: anuncio.images?.length ? anuncio.images : [anuncio.img || 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&auto=format&fit=crop&q=60'],
            urgency: anuncio.urgencia || 'Normal',
            rating: anuncio.modalidad || 'Empleo',
            applicants: parseInt(anuncio.postulaciones_count) || 0,
            tags: anuncio.categorias || [],
            matchScore: anuncio.__score,
            distanciaKm: anuncio.__distancia,
            tipoAnuncio: anuncio.tipo_anuncio || 'Empleo',
            modalidad: anuncio.modalidad || 'Presencial',
            estado: anuncio.estado_anuncio
          };
        });

        this.categoriasDisponibles = this.extraerCategorias(this.jobs);
        this.currentSlide = 0;
        this.maxVisible = Math.max(8, this.jobs.length);
        this.visibleCount = Math.min(8, this.maxVisible);

        this.cargarVistosRecientemente();
      },
      error: () => {
        this.slides = [];
        this.jobs = [];
        this.currentSlide = 0;
        this.visibleCount = 8;
        this.maxVisible = 8;
        this.etiquetasInteres = [];
        this.vistosRecientemente = [];
      }
    });
  }

  private calcularMatch(categorias: string[], etiquetasInteres: string[]): number {
    if (!categorias.length || !etiquetasInteres.length) {
      return 0;
    }
    const intereses = new Set(etiquetasInteres.map((item) => item.toLowerCase()));
    return categorias.filter((categoria) => intereses.has(String(categoria).toLowerCase())).length;
  }

  formatearSalario(monto: any, moneda: string = 'MXN', periodo: string = 'Mensual'): string {
    if (!monto) return 'Salario no especificado';
    const num = parseFloat(monto);
    if (isNaN(num) || num === 0) return 'Salario a convenir';

    const divisa = (moneda || 'MXN').toUpperCase();
    const frecuencia = (periodo || 'Mensual').toLowerCase();
    return `${divisa} $${num.toLocaleString('es-MX')} / ${frecuencia}`;
  }

  private obtenerSalarioEnMXN(job: Job): number {
    const salarioBase = job.salaryRaw || parseFloat(String(job.salary || '').replace(/[^0-9.]/g, '')) || 0;
    const tasa = this.tasasCambio[job.moneda || 'MXN'] || 1;
    let salarioMxn = salarioBase * tasa;

    const periodo = (job.periodoPago || 'Mensual').toLowerCase();
    if (periodo === 'diario') salarioMxn *= 30;
    else if (periodo === 'semanal') salarioMxn *= 4;
    else if (periodo === 'quincenal') salarioMxn *= 2;

    return salarioMxn;
  }

  private cargarFavoritosGuardados() {
    const usuario = this.api.getUsuario();
    if (usuario?.rol !== 'postulante') {
      this.favoriteJobIds.clear();
      return;
    }
    this.api.obtenerFavoritos().subscribe({
      next: (favoritos: any[]) => {
        this.favoriteJobIds = new Set((favoritos || []).map((fav) => String(fav.id_anuncio)));
      },
      error: () => {
        this.favoriteJobIds.clear();
      }
    });
  }

  private cargarVistosRecientemente() {
    const stored = localStorage.getItem('chambee_vistos_recientemente');
    if (stored && this.jobs.length > 0) {
      try {
        const ids = JSON.parse(stored) as string[];
        this.vistosRecientemente = ids
          .map(id => this.jobs.find(j => String(j.id) === String(id)))
          .filter(j => j !== undefined) as Job[];
      } catch (e) {
        console.error("Error leyendo historial", e);
      }
    }
  }

  private registrarVista(id: string | number) {
    const strId = String(id);
    let historial: string[] = [];
    const stored = localStorage.getItem('chambee_vistos_recientemente');
    if (stored) {
      try {
        historial = JSON.parse(stored);
      } catch (e) {
        historial = [];
      }
    }
    historial = historial.filter(itemId => itemId !== strId);
    historial.unshift(strId);
    if (historial.length > 10) {
      historial = historial.slice(0, 10);
    }
    localStorage.setItem('chambee_vistos_recientemente', JSON.stringify(historial));
  }

  irAlPerfil() {
    this.menuOpen = false;
    this.router.navigate(['/perfil-postulante']);
  }

  openJob(id?: string | number) {
    if (id) {
      this.registrarVista(id);
      this.router.navigate(['/job', id]);
    }
  }

  openFeaturedJob(id?: string | number) {
    if (id) {
      this.registrarVista(id);
      this.router.navigate(['/job', id]);
    }
  }

  isFavorite(id?: string | number): boolean {
    return id ? this.favoriteJobIds.has(String(id)) : false;
  }

  isSavingFavorite(id?: string | number): boolean {
    return id ? this.savingFavoriteId === String(id) : false;
  }

  toggleFavorite(job: Job, event: Event) {
    event.stopPropagation();
    if (!job.id || this.savingFavoriteId) {
      return;
    }
    const id = String(job.id);
    this.savingFavoriteId = id;
    const accion$ = this.isFavorite(id)
      ? this.api.eliminarFavorito(id)
      : this.api.guardarFavorito(id);

    accion$.subscribe({
      next: (response: any) => {
        if (response?.favorito) {
          this.favoriteJobIds.add(id);
        } else {
          this.favoriteJobIds.delete(id);
        }
        this.savingFavoriteId = null;
      },
      error: (err) => {
        console.error('Error al actualizar favorito:', err);
        this.mostrarModal(err.error?.error || 'No fue posible actualizar tus favoritos.');
        this.savingFavoriteId = null;
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(_event: Event) {
    if (this.notificationsOpen) {
      this.notificationsOpen = false;
    }
    if (this.menuServicioAbierto !== null) {
      this.menuServicioAbierto = null;
    }
  }

  logout() {
    this.authApi.logout();
    this.menuOpen = false;
    this.servicesOpen = false;
  }

  irACrearServicio() {
    this.router.navigate(['/crear-servicio']);
  }

  get visibleServices(): any[] {
    return this.servicesOpen ? this.services : this.services.slice(0, 4);
  }

  verTodosLosServicios() {
    this.router.navigate(['/search'], { queryParams: { tipo: 'servicio' } });
  }

  toggleServices() {
    this.servicesOpen = !this.servicesOpen;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  openService(index: number) {
    const servicio = this.services[index];
    if (!servicio) return;
    const id = servicio.id_servicio || servicio.id;
    if (!id) return;

    this.servicioDetalleCargando = true;
    this.servicioDetalleOpen = true;

    this.api.obtenerServicioDetalle(String(id)).subscribe({
      next: (detalle) => {
        this.servicioDetalle = detalle;
        this.servicioDetalleCargando = false;
      },
      error: (err) => {
        console.error('Error al cargar detalle del servicio:', err);
        this.servicioDetalle = servicio;
        this.servicioDetalleCargando = false;
      }
    });
  }

  cerrarDetalleServicio() {
    this.servicioDetalleOpen = false;
    this.servicioDetalle = null;
  }

  verPerfilAutor(autorId: string) {
    if (autorId) {
      this.cerrarDetalleServicio();
      this.router.navigate(['/perfil-postulante', autorId]);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  checkMobile() {
    try {
      this.isMobile = window.innerWidth <= 768;
    } catch {
      this.isMobile = false;
    }
  }

  showMoreJobs() {
    this.visibleCount = Math.min(this.visibleCount + 8, this.maxVisible);
  }

  get filteredJobs(): Job[] {

    const filtrados = this.jobs.filter((job) => {

      if (job.estado?.toUpperCase() !== 'ACTIVO') {
        return false;
      }
      
      const coincideCategoria = !this.filtros.categoriaEmpleo
        ? true
        : (job.tags || []).some((tag) => this.normalizarTexto(tag) === this.normalizarTexto(this.filtros.categoriaEmpleo));

      const coincideModalidad = !this.filtros.modalidad
        ? true
        : this.normalizarTexto(job.modalidad) === this.normalizarTexto(this.filtros.modalidad);

      const coincideMoneda = !this.filtros.moneda
        ? true
        : (job.moneda || 'MXN').toUpperCase() === this.filtros.moneda.toUpperCase();

      const salarioAComparar = this.filtros.moneda
        ? (job.salaryRaw || parseFloat(String(job.salary || '').replace(/[^0-9.]/g, '')) || 0)
        : this.obtenerSalarioEnMXN(job);

      const coincideSalarioMin = this.filtros.salarioMin == null || this.filtros.salarioMin === 0
        ? true
        : salarioAComparar >= this.filtros.salarioMin;

      const coincideSalarioMax = this.filtros.salarioMax == null || this.filtros.salarioMax === 0
        ? true
        : salarioAComparar <= this.filtros.salarioMax;

      let coincideDistancia = true;


      if (this.filtros.distancia) {
        const distancia = job.distanciaKm;

        if (distancia == null) {
          coincideDistancia = false;
        } else {
          switch (this.filtros.distancia) {
            case '10':
              coincideDistancia = distancia < 10;
              break;

            case '25':
              coincideDistancia = distancia >= 10 && distancia < 25;
              break;

            case '50':
              coincideDistancia = distancia >= 25 && distancia < 50;
              break;

            case '100':
              coincideDistancia = distancia >= 50 && distancia < 100;
              break;

            case '100+':
              coincideDistancia = distancia >= 100;
              break;
          }
        }
      }

      return coincideCategoria && coincideModalidad && coincideMoneda && coincideSalarioMin && coincideSalarioMax && coincideDistancia;
    });

    if (this.filtros.ordenar === 'distancia') {

      return [...filtrados].sort((a, b) => {

        // Anuncios sin ubicación al final
        if (a.distanciaKm == null && b.distanciaKm == null) {
          return 0;
        }

        if (a.distanciaKm == null) {
          return 1;
        }

        if (b.distanciaKm == null) {
          return -1;
        }

        return a.distanciaKm - b.distanciaKm;
      });
    }
    return filtrados;
  }

  get jobsToShow(): Job[] {
    return this.filteredJobs.slice(0, this.visibleCount);
  }

  get maxJobsToShow(): number {
    return this.filteredJobs.length;
  }

  agregarNotificacion(datos: any) {
    const nuevaNotificacion: NotificationItem = {
      id: Date.now(),
      title: datos.titulo,
      message: datos.mensaje,
      time: 'Hace un momento',
      read: false,
      idAnuncio: datos.idAnuncio,
      tipo: datos.tipo
    };

    this.notifications.unshift(nuevaNotificacion);
    this.hasUnreadNotifications = true;

    this.cdr.detectChanges();
  }

  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  limpiarFiltros(): void {
    this.filtros = {
      modalidad: '',
      ciudad: '',
      categoriaEmpleo: '',
      categoriaServicio: '',
      cobertura: '',
      distancia: '',
      ordenar: 'fecha',
      moneda: '',
      salarioMin: null,
      salarioMax: null
    };
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.visibleCount = Math.min(8, this.maxJobsToShow);
  }

  private extraerCategorias(jobs: Job[]): string[] {
    const categorias = new Set<string>(this.categoriasPreDefinidas);
    jobs.forEach((job) => {
      (job.tags || []).forEach((tag) => {
        const categoria = String(tag || '').trim();
        if (categoria) {
          categorias.add(categoria);
        }
      });
    });

    return Array.from(categorias).sort((a, b) => a.localeCompare(b));
  }

  nextSlide() {
    if (!this.slides.length) return;
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    if (!this.slides.length) return;
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number) {
    if (!this.slides.length) return;
    this.currentSlide = index;
  }

  toggleFaq(index: number) {
    this.faqOpen = this.faqOpen === index ? null : index;
  }

  enviarSoporte(form: any) {
    if (!form?.valid) {
      form?.control?.markAllAsTouched();
      return;
    }
    this.http.post('http://localhost:3000/api/support', form.value)
      .subscribe({
        next: () => {
          form.resetForm({
            nombreCompleto: '', empresa: '', telefono: '', correo: '', asunto: '', detalles: ''
          });
          this.mostrarModalExito('Tu mensaje fue recibido. Te contactaremos a la brevedad.');
        },
        error: () => this.mostrarModal('Hubo un error al enviar tu mensaje. Inténtalo de nuevo.')
      });
  }

  mostrarModal(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalAlerta');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModal() {
    const modal = document.getElementById('modalAlerta');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  mostrarModalExito(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalSaludo');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModalExito() {
    const modal = document.getElementById('modalSaludo');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  toggleMenuServicio(index: number, event: Event) {
    event.stopPropagation();
    this.menuServicioAbierto = this.menuServicioAbierto === index ? null : index;
  }

  editarServicio(index: number) {
    const servicioSeleccionado = this.visibleServices[index];
    const id = servicioSeleccionado.id_servicio || servicioSeleccionado.id;
    if (id) {
      this.router.navigate(['/editar-servicio', id]);
    }
  }

  eliminarServicio(index: number) {
    const servicioSeleccionado = this.visibleServices[index];
    const id = servicioSeleccionado.id_servicio || servicioSeleccionado.id;
    if (!id) {
      return;
    }
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    this.http.delete(`http://localhost:3000/servicios/${id}`, { headers }).subscribe({
      next: () => {
        this.services = this.services.filter(s => (s.id_servicio || s.id) !== id);
        this.menuServicioAbierto = null;
        this.mostrarModalExito('El servicio ha sido eliminado correctamente.');
      },
      error: (err) => {
        console.error('Error al intentar eliminar:', err);
        this.mostrarModal('Hubo un error al intentar eliminar el servicio.');
      }
    });
  }

  onSearchInput(value: string) {
    this.showSearchDropdown = true;
    if (value && value.trim().length > 0) {
      this.searchSubject.next(value);
    } else {
      this.searchResults = [];
    }
  }

  ejecutarBusqueda(query: string) {
    const tokens = this.normalizarTexto(query).split(/\s+/).filter(t => t.length > 0);

    const jobsResults = this.jobs.filter(job => {
      if (job.estado?.toLowerCase() === 'cerrado') {
        return false;
      }
      const textoCompleto = this.normalizarTexto(`${job.title} ${job.company} ${job.tags.join(' ')}`);
      return tokens.every(token => textoCompleto.includes(token));
    }).map(j => ({ ...j, tipo: 'empleo' }));

    const servicesResults = this.services.filter(service => {
      const titulo = service.title || service.titulo || '';
      const desc = service.description || service.descripcion || '';
      const cat = service.categoria || '';
      const textoCompleto = this.normalizarTexto(`${titulo} ${desc} ${cat}`);
      return tokens.every(token => textoCompleto.includes(token));
    }).map(s => ({ ...s, tipo: 'servicio' }));

    this.searchResults = [...jobsResults, ...servicesResults].slice(0, 6);
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
      this.openJob(resultado.id || resultado.id_anuncio);
    } else {
      const idx = this.services.findIndex(s => (s.id_servicio || s.id) === (resultado.id_servicio || resultado.id));
      if (idx !== -1) this.openService(idx);
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

  verTodosResultados() {
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
}