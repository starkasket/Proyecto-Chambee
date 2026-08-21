import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { CarouselComponent } from '../../components/carousel/carousel.component';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
}

interface Job {
  id?: string | number;
  company: string;
  title: string;
  salary: string;
  img: string;
  images?: string[];
  urgency?: string;
  rating: string;
  applicants: number;
  tags?: string[];
  tipoAnuncio?: string;
  modalidad?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CarouselComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  constructor(
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private readonly http: HttpClient,
    private readonly api: ApiService,
    private readonly authApi: AuthService
  ) {}

  servicesOpen = false;
  menuOpen = false;
  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 8;
  isMobile = false;
  modalLoginVisible = false;

  // Variables para el buscador estilo Coursera (Pro)
  searchTerm = '';
  readonly searchSubject = new Subject<string>();
  searchResults: any[] = [];
  showSearchDropdown = false;
  recentSearches: string[] = [];

  // Variables para filtros
  categoriaSeleccionada = 'Todas';
  categoriasDisponibles: string[] = [];
  categoriasOpen = false;
  tipoSeleccionado = 'Todos';
  tiposDisponibles: string[] = [];
  tiposOpen = false;

  private readonly categoriasPreDefinidas: string[] = [
    'Administración / Oficina',
    'Agricultura / Ganadería',
    'Atención al cliente',
    'Construcción / Obra',
    'Diseño',
    'Educación / Docencia',
    'Finanzas / Contabilidad',
    'Ingeniería',
    'Legal / Derecho',
    'Logística / Transporte',
    'Manufactura / Producción',
    'Marketing / Publicidad',
    'Recursos Humanos',
    'Restaurantes / Gastronomía',
    'Salud / Medicina',
    'Seguridad / Vigilancia',
    'Servicios de limpieza',
    'Servicios técnicos / Mantenimiento',
    'Tecnología / TI',
    'Turismo / Hotelería',
    'Ventas'
  ];

  private slideIntervalId?: ReturnType<typeof setInterval>;

  slides: Slide[] = [];
  services: any[] = [];
  jobs: Job[] = [];

  ngOnInit() {
    this.slideIntervalId = setInterval(() => this.nextSlide(), 9000);
    this.checkMobile();
    this.cargarBusquedasRecientes();

    // Cargar servicios públicos desde la BD
    this.api.obtenerServiciosPublicos().subscribe({
      next: (servicios) => {
        this.services = servicios;
      },
      error: () => {
        this.services = [];
      }
    });

    const token = this.authApi.getToken();
    if (token) {
      const usuario = this.api.getUsuario();
      if (usuario.rol === "empleador") {
        this.router.navigate(['/home-employer']);
      } else if (usuario.rol === "postulante") {
        this.router.navigate(['/home-user']);
      }
    }

    this.api.obtenerAnunciosPublicos().subscribe({
      next: (anuncios: any[]) => {
        if (anuncios && anuncios.length > 0) {
          this.slides = anuncios.slice(0, Math.min(5, anuncios.length)).map((anuncio, index) => ({
            id: anuncio.id_anuncio,
            company: anuncio.nombre_empresa || 'Empresa',
            companyDescription: anuncio.descripcion_empresa || 'Empresa activa en Chambee.',
            title: anuncio.titulo || 'Posición disponible',
            salary: anuncio.salario ? `$${anuncio.salario.toLocaleString()} MXN` : 'Salario competitivo',
            location: `${anuncio.ciudad || 'Ciudad'}, ${anuncio.estado || 'Estado'}`,
            mode: anuncio.modalidad || 'Modalidad',
            urgency: anuncio.urgencia || 'Normal',
            description: anuncio.descripcion || 'Vacante publicada recientemente.',
            img: anuncio.img || `https://picsum.photos/900/320?random=${index + 200}`
          }));

          this.jobs = anuncios.map((anuncio, index) => ({
            id: anuncio.id_anuncio,
            company: anuncio.nombre_empresa || 'Empresa',
            title: anuncio.titulo || 'Posición disponible',
            salary: anuncio.salario ? `$${anuncio.salario.toLocaleString()} MXN` : 'Salario competitivo',
            img: anuncio.img || '',
            images: anuncio.images?.length ? anuncio.images : [anuncio.img || `https://picsum.photos/300/150?random=${index + 100}`],
            urgency: anuncio.urgencia || 'Normal',
            rating: '4.5',
            applicants: parseInt(anuncio.postulaciones_count) || 0,
            tags: anuncio.categorias || [],
            tipoAnuncio: anuncio.tipo_anuncio || 'Empleo',
            modalidad: anuncio.modalidad || 'Presencial'
          }));

          
           
          this.categoriasDisponibles = this.extraerCategorias(this.jobs);
          this.tiposDisponibles = this.extraerTipos(this.jobs);
          this.categoriaSeleccionada = 'Todas';
          this.tipoSeleccionado = 'Todos';
        }

        this.maxVisible = Math.max(8, this.jobs.length);
        this.visibleCount = Math.min(8, this.maxVisible);
      },
      error: (err) => {
        console.error('Error al cargar anuncios públicos:', err);
        this.slides = [];
        this.jobs = [];
        this.currentSlide = 0;
        this.maxVisible = 8;
        this.visibleCount = 8;
      }
    });

    // Escuchar el buscador con RxJS
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.ejecutarBusqueda(query);
    });
  }

  ngOnDestroy() {
    if (this.slideIntervalId) clearInterval(this.slideIntervalId);
  }

  get visibleServices(): any[] {
    return this.servicesOpen ? this.services : this.services.slice(0, 4);
  }

  toggleServices() { this.servicesOpen = !this.servicesOpen; }
  toggleMenu() { this.menuOpen = !this.menuOpen; }
  toggleTheme() { this.themeService.toggleTheme(); }
  get isDarkMode(): boolean { return this.themeService.isDarkMode(); }

  // Abrir un servicio (desde el panel lateral) requiere sesión.
  openService(_i: number) {
    const token = this.authApi.getToken();
    if (token) {
      this.router.navigate(['/home-user']);
    } else {
      this.modalLoginVisible = true;
    }
  }

  cerrarModalLogin() {
    this.modalLoginVisible = false;
  }

  irAlLogin() {
    this.modalLoginVisible = false;
    this.router.navigate(['/login']);
  }

  // Ver el detalle de un empleo SÍ está permitido sin sesión (solo postularse
  // requiere login, y eso se valida dentro de job-detail.component).
  openJob(id?: string | number) {
    if (id) {
      this.router.navigate(['/job', id]);
    } else {
      this.router.navigate(['/jobs']);
    }
  }

  openFeaturedJob(id?: string | number) {
    // Reutiliza la lógica de openJob para evitar duplicación
    this.openJob(id);
  }

  @HostListener('window:resize')
  onResize() { this.checkMobile(); }

  checkMobile() { this.isMobile = window.innerWidth <= 768; }

  showMoreJobs() { this.visibleCount = Math.min(this.visibleCount + 8, this.maxJobsToShow); }

  get filteredJobs(): Job[] {
    return this.jobs.filter((job) => {
      const coincideCategoria = !this.categoriaSeleccionada || this.categoriaSeleccionada === 'Todas'
        ? true
        : (job.tags || []).some((tag) => this.normalizarTexto(tag) === this.normalizarTexto(this.categoriaSeleccionada));

      const coincideTipo = this.tipoSeleccionado === 'Todos'
        ? true
        : [job.tipoAnuncio, job.modalidad].some((valor) => this.normalizarTexto(valor) === this.normalizarTexto(this.tipoSeleccionado));

      return coincideCategoria && coincideTipo;
    });
  }

  get jobsToShow(): Job[] {
    return this.filteredJobs.slice(0, this.visibleCount);
  }

  get maxJobsToShow(): number {
    return this.filteredJobs.length;
  }

  toggleCategorias() {
    this.categoriasOpen = !this.categoriasOpen;
    this.tiposOpen = false;
  }

  toggleTipos() {
    this.tiposOpen = !this.tiposOpen;
    this.categoriasOpen = false;
  }

  seleccionarCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
    this.categoriasOpen = false;
    this.visibleCount = Math.min(8, this.maxJobsToShow);
  }

  seleccionarTipo(tipo: string) {
    this.tipoSeleccionado = tipo;
    this.tiposOpen = false;
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

  private extraerTipos(jobs: Job[]): string[] {
    const tipos = new Set<string>();
    jobs.forEach((job) => {
      [job.tipoAnuncio, job.modalidad].forEach((valor) => {
        const tipo = String(valor || '').trim();
        if (tipo) {
          tipos.add(tipo);
        }
      });
    });

    return Array.from(tipos).sort((a, b) => a.localeCompare(b));
  }

  private normalizarTexto(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.toLowerCase().trim();
    if (typeof value === 'object') return JSON.stringify(value).toLowerCase().trim();
    return String(value).toLowerCase().trim();
  }

  nextSlide() {
    if (!this.slides.length) return;
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }
  prevSlide() {
    if (!this.slides.length) return;
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }
  goToSlide(i: number) {
    if (!this.slides.length) return;
    this.currentSlide = i;
  }

  faqOpen: number | null = null;
  toggleFaq(i: number) { this.faqOpen = this.faqOpen === i ? null : i; }

  enviarSoporte(form: any) {
    if (!form?.valid) {
      form?.control?.markAllAsTouched();
      return;
    }

    this.http.post('http://localhost:3000/api/support', form.value)
      .subscribe({
        next: () => {
          alert("Mensaje enviado correctamente");
          form.resetForm({
            nombreCompleto: '',
            empresa: '',
            telefono: '',
            correo: '',
            asunto: '',
            detalles: ''
          });
        },
        error: () => alert("Error al enviar")
      });
  }

  // --- LÓGICA DEL BUSCADOR ESTILO COURSERA (PRO) ---

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
    const lowerQuery = query.toLowerCase();

    const jobsResults = this.jobs.filter(job =>
      job.title.toLowerCase().includes(lowerQuery) ||
      job.company.toLowerCase().includes(lowerQuery)
    ).map(j => ({ ...j, tipo: 'empleo' }));

    const servicesResults = this.services.filter(service =>
      service.title.toLowerCase().includes(lowerQuery) ||
      (service.description?.toLowerCase().includes(lowerQuery) ?? false)
    ).map(s => ({ ...s, tipo: 'servicio' }));

    this.searchResults = [...jobsResults, ...servicesResults].slice(0, 6);
  }

  cerrarBuscador() {
    setTimeout(() => {
      this.showSearchDropdown = false;
    }, 200);
  }

  // Clic en un resultado del dropdown en vivo.
  irAResultado(resultado: any) {
    this.guardarBusquedaReciente(this.searchTerm || resultado.title);
    this.showSearchDropdown = false;
    this.searchTerm = '';

    if (resultado.tipo === 'empleo') {
      // Ver el empleo NO requiere sesión.
      this.router.navigate(['/job', resultado.id]);
    } else {
      // Interactuar con un servicio SÍ requiere sesión (misma regla que openService).
      const token = this.authApi.getToken();
      if (token) {
        this.router.navigate(['/home-user']);
      } else {
        this.modalLoginVisible = true;
      }
    }
  }

  cargarBusquedasRecientes() {
    const stored = localStorage.getItem('chambee_busquedas_recientes');
    if (stored) {
      try { this.recentSearches = JSON.parse(stored); } catch(e) {}
    }
  }

  guardarBusquedaReciente(term: string) {
    if (!term || term.trim() === '') return;
    let searches = [...this.recentSearches];
    searches = searches.filter(t => t.toLowerCase() !== term.toLowerCase());
    searches.unshift(term);
    if (searches.length > 4) searches = searches.slice(0, 4);

    this.recentSearches = searches;
    localStorage.setItem('chambee_busquedas_recientes', JSON.stringify(searches));
  }

  // Clic en un ítem del historial: manda directo a la página de resultados.
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

  highlightText(text: string, query: string): string {
    if (!query || !text) return text;
      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return text.replace(regex, '<span class="text-highlight">$1</span>');
  }

}
