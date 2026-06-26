import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
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
  urgency?: string;
  rating: string;
  applicants: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  constructor(
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private http: HttpClient,
    private api: ApiService,
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
  searchSubject = new Subject<string>();
  searchResults: any[] = [];
  showSearchDropdown = false;
  recentSearches: string[] = [];

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
            img: anuncio.img || `https://picsum.photos/300/150?random=${index + 100}`,
            urgency: anuncio.urgencia || 'Normal',
            rating: '4.5',
            applicants: Math.floor(Math.random() * 15)
          }));
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

  openJob(id?: string | number) {
    if (id) {
      this.router.navigate(['/job', id]);
    } else {
      this.router.navigate(['/jobs']);
    }
  }

  openFeaturedJob(id?: string | number) {
    if (id) {
      this.router.navigate(['/job', id]);
    } else {
      this.router.navigate(['/jobs']);
    }
  }

  @HostListener('window:resize')
  onResize() { this.checkMobile(); }

  checkMobile() { this.isMobile = window.innerWidth <= 768; }

  showMoreJobs() { this.visibleCount = Math.min(this.visibleCount + 8, this.maxVisible); }

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
      (service.description && service.description.toLowerCase().includes(lowerQuery))
    ).map(s => ({ ...s, tipo: 'servicio' }));

    this.searchResults = [...jobsResults, ...servicesResults].slice(0, 6);
  }

  cerrarBuscador() {
    setTimeout(() => {
      this.showSearchDropdown = false;
    }, 200);
  }

  irAResultado(resultado: any) {
    alert(resultado)
    console.log(resultado);
    
    this.guardarBusquedaReciente(this.searchTerm || resultado.title);
    this.showSearchDropdown = false;
    this.searchTerm = '';

    if (resultado.tipo === 'empleo') {
      this.router.navigate(['/job', resultado.id]);
    } else {
      this.router.navigate(['/services']);
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

  seleccionarBusquedaReciente(term: string) {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  verTodosResultados() {
    this.guardarBusquedaReciente(this.searchTerm);
    this.showSearchDropdown = false;
    this.router.navigate(['/jobs'], { queryParams: { q: this.searchTerm } });
  }

  highlightText(text: string, query: string): string {
    if (!query || !text) return text;
    const safeQuery = query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return text.replace(regex, '<span class="text-highlight">$1</span>');
  }
}