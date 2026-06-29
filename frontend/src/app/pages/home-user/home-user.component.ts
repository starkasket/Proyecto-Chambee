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
  img: string;
  urgency?: string;
  rating: string;
  applicants: number;
  tags: string[];
  matchScore: number;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface SearchResult {
  id?: string | number;
  id_servicio?: string | number;
  title?: string;
  company?: string;
  categoria?: string;
  tipo: 'empleo' | 'servicio';
  [key: string]: any;
}

@Component({
  selector: 'app-home-user',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
  
  hasUnreadNotifications = false; 
  
  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 8;
  isMobile = false;
  faqOpen: number | null = null;
  modalMensaje = '';
  menuServicioAbierto: number | null = null;
  favoriteJobIds = new Set<string>();
  savingFavoriteId: string | null = null;

  usuarioActualId: string | null = null;

  searchTerm = '';
  searchSubject = new Subject<string>();
  searchResults: any[] = [];
  showSearchDropdown = false;
  recentSearches: string[] = [];

  private slideIntervalId?: ReturnType<typeof setInterval>;

  notifications: NotificationItem[] = [];

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
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    this.cargarNotificaciones(); // <-- Cargar notificaciones al iniciar

    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);

    this.checkMobile();
    this.cargarOfertasPublicas();
    this.cargarFavoritosGuardados();
    this.cargarBusquedasRecientes(); 

    const usuario = this.api.getUsuario();
    if (usuario?.id) {

      this.socketService.conectarEmpleador(usuario.id); 
      
      this.socketService.escucharRespuestasPostulante().subscribe((datosAlerta) => {
        this.agregarNotificacion(datosAlerta);
      });

      this.api.getMiPerfil().subscribe({
        next: (perfil: any) => {
          this.nombre_postulante = perfil?.nombre_postulante || 'Usuario';
          this.foto_perfil = perfil?.foto_perfil || '';
        },
        error: () => {
          this.nombre_postulante = usuario?.nombre || 'Usuario';
        }
      });
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

  ngOnDestroy() {
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
    }
  }

  // MÉTODO NUEVO: CARGAR NOTIFICACIONES DESDE EL BACKEND
  cargarNotificaciones() {
    this.api.obtenerNotificaciones().subscribe({
      next: (notifs) => {
        this.notifications = notifs.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: new Date(n.time).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
          read: n.read
        }));
        this.hasUnreadNotifications = this.notifications.some(n => !n.read);
      },
      error: (err) => console.error('Error al obtener notificaciones', err)
    });
  }

  // MÉTODO ACTUALIZADO: MARCAR COMO LEIDAS
  toggleNotifications(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen = !this.notificationsOpen;
    
    if (this.notificationsOpen && this.hasUnreadNotifications) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach((n) => n.read = true);
      
      this.api.marcarNotificacionesLeidas().subscribe({
        error: (err) => console.error('Error al actualizar estado de notificaciones', err)
      });
    }
    this.menuOpen = false;
  }

  agregarNotificacion(datos: any) {
    const nuevaNotificacion: NotificationItem = {
      id: Date.now(),
      title: datos.titulo,
      message: datos.mensaje,
      time: 'Hace un momento',
      read: false
    };

    this.notifications.unshift(nuevaNotificacion);
    this.hasUnreadNotifications = true;
    this.cdr.detectChanges(); 
  }

  onNotificationClick(notif: NotificationItem, event: Event) {
    event.stopPropagation();
    notif.read = true;
    this.notificationsOpen = false;
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
          .map((anuncio, index) => ({
            ...anuncio,
            __score: this.calcularMatch(anuncio.categorias || [], etiquetas),
            __index: index
          }))
          .sort((a, b) => {
            if (b.__score !== a.__score) {
              return b.__score - a.__score;
            }
            return a.__index - b.__index;
          });

        const ofertas = anunciosOrdenados.map((anuncio) => ({
          id: anuncio.id_anuncio,
          company: anuncio.nombre_empresa || 'Empresa Confidencial',
          companyDescription: anuncio.descripcion_empresa || 'Empresa activa en Chambee.',
          title: anuncio.titulo,
          salary: this.formatearSalario(anuncio.salario),
          location: `${anuncio.ciudad}, ${anuncio.estado}`,
          mode: anuncio.modalidad,
          urgency: anuncio.urgencia || 'Normal',
          description: anuncio.descripcion,
          img: anuncio.img || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&auto=format&fit=crop&q=60',
          tags: anuncio.categorias || [],
          matchScore: anuncio.__score
        }));

        this.slides = ofertas.slice(0, Math.min(5, ofertas.length));

        this.jobs = anunciosOrdenados.map((anuncio) => ({
          id: anuncio.id_anuncio,
          company: anuncio.nombre_empresa || 'Empresa Confidencial',
          title: anuncio.titulo,
          salary: this.formatearSalario(anuncio.salario),
          img: anuncio.img || 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&auto=format&fit=crop&q=60',
          urgency: anuncio.urgencia || 'Normal',
          rating: anuncio.modalidad || 'Empleo',
          applicants: anuncio.vistas || 0,
          tags: anuncio.categorias || [],
          matchScore: anuncio.__score
        }));

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

  private formatearSalario(salario: string | number): string {
    const numero = Number(salario);
    if (Number.isNaN(numero) || numero === 0) {
      return 'Salario a convenir';
    }
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(numero);
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
    console.log('Abriendo servicio:', index);
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

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm = value;
    this.showSearchDropdown = true;
    if (value.trim().length > 0) {
      this.searchSubject.next(value);
    } else {
      this.searchResults = [];
    }
  }

  ejecutarBusqueda(query: string) {
    const lowerQuery = this.normalizarTexto(query);
    const jobsResults = this.jobs.filter(job =>
      this.normalizarTexto(job.title).includes(lowerQuery) ||
      this.normalizarTexto(job.company).includes(lowerQuery) ||
      job.tags.some(t => this.normalizarTexto(t).includes(lowerQuery))
    ).map(j => ({ ...j, tipo: 'empleo' }));

    const servicesResults = this.services.filter(service =>
      this.normalizarTexto(service.title).includes(lowerQuery) ||
      this.normalizarTexto(service.description).includes(lowerQuery) ||
      this.normalizarTexto(service.categoria).includes(lowerQuery)
    ).map(s => ({ ...s, tipo: 'servicio' }));

    this.searchResults = [...jobsResults, ...servicesResults].slice(0, 6);
  }

  cerrarBuscador() {
    setTimeout(() => {
      this.showSearchDropdown = false;
    }, 200);
  }

  irAResultado(resultado: any) {
    console.log('Resultado seleccionado:', resultado);
    this.guardarBusquedaReciente(this.searchTerm || resultado.title || resultado.categoria || '');
    this.showSearchDropdown = false;
    this.searchTerm = '';

    if (resultado.tipo === 'empleo') {
      this.openJob(resultado.id);
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
    this.searchSubject.next(term);
  }

  verTodosResultados() {
    this.guardarBusquedaReciente(this.searchTerm);
    this.showSearchDropdown = false;
    this.router.navigate(['/jobs'], { queryParams: { q: this.searchTerm } });
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