import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CarouselComponent } from '../../components/carousel/carousel.component';

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
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CarouselComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  servicesOpen = false;
  menuOpen = false;
  
  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 8;
  isMobile = false;
  faqOpen: number | null = null;
  modalMensaje = '';
  menuServicioAbierto: number | null = null;

  servicioDetalle: any = null;
  servicioDetalleOpen = false;
  servicioDetalleCargando = false;

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

  slides: Slide[] = [];
  jobs: Job[] = [];
  services: any[] = [];

  constructor(
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private readonly http: HttpClient,
    private readonly api: ApiService,
    private readonly authApi: AuthService
  ) {}

  ngOnInit() {
    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);

    this.checkMobile();
    this.cargarOfertasPublicas();
    this.cargarBusquedasRecientes(); 

    this.api.obtenerServiciosPublicos().subscribe({
      next: (servicios) => {
        this.services = servicios || [];
      },
      error: () => {
        this.services = [];
      }
    });

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

  scrollToSupport(): void {
    const supportElement = document.getElementById('support-section');
    if (supportElement) {
      supportElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private cargarOfertasPublicas() {
    this.api.obtenerAnunciosPublicos().subscribe({
      next: (anuncios) => {
        if (!anuncios || !anuncios.length) {
          this.slides = [];
          this.jobs = [];
          return;
        }

        const ofertas = anuncios.map((anuncio, index) => {
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
            matchScore: 0
          };
        });

        this.slides = ofertas.slice(0, Math.min(5, ofertas.length));

        this.jobs = anuncios.map((anuncio, index) => {
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
            matchScore: 0,
            tipoAnuncio: anuncio.tipo_anuncio || 'Empleo',
            modalidad: anuncio.modalidad || 'Presencial'
          };
        });

        this.categoriasDisponibles = this.extraerCategorias(this.jobs);
        this.currentSlide = 0;
        this.maxVisible = Math.max(8, this.jobs.length);
        this.visibleCount = Math.min(8, this.maxVisible);
      },
      error: () => {
        this.slides = [];
        this.jobs = [];
        this.currentSlide = 0;
        this.visibleCount = 8;
        this.maxVisible = 8;
      }
    });
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

  openJob(id?: string | number) {
    if (id) {
      this.router.navigate(['/job', id]);
    }
  }

  openFeaturedJob(id?: string | number) {
    if (id) {
      this.router.navigate(['/job', id]);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(_event: Event) {
    if (this.menuServicioAbierto !== null) {
      this.menuServicioAbierto = null;
    }
  }

  verTodosLosServicios() {
    this.router.navigate(['/search'], { queryParams: { tipo: 'servicio' } });
  }

  toggleServices() {
    this.servicesOpen = !this.servicesOpen;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
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
    return this.jobs.filter((job) => {
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

      return coincideCategoria && coincideModalidad && coincideMoneda && coincideSalarioMin && coincideSalarioMax;
    });
  }

  get jobsToShow(): Job[] {
    return this.filteredJobs.slice(0, this.visibleCount);
  }

  get maxJobsToShow(): number {
    return this.filteredJobs.length;
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