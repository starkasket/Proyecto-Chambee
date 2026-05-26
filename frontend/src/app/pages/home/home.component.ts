import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface Slide {
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

  private slideIntervalId?: ReturnType<typeof setInterval>;

  slides: Slide[] = [];
  services: any[] = [];
  jobs: Job[] = [];

  ngOnInit() {
    this.slideIntervalId = setInterval(() => this.nextSlide(), 9000);
    this.checkMobile();

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
            company: anuncio.nombre_empresa || 'Empresa',
            companyDescription: anuncio.descripcion_empresa || 'Empresa activa en Chambee.',
            title: anuncio.titulo || 'Posición disponible',
            salary: anuncio.salario ? `$${anuncio.salario.toLocaleString()} MXN` : 'Salario competitivo',
            location: `${anuncio.ciudad || 'Ciudad'}, ${anuncio.estado || 'Estado'}`,
            mode: anuncio.modalidad || 'Modalidad',
            urgency: anuncio.urgencia || 'Normal',
            description: anuncio.descripcion || 'Vacante publicada recientemente.',
            img: `https://picsum.photos/900/320?random=${index + 200}`
          }));

          this.jobs = anuncios.map((anuncio, index) => ({
            company: anuncio.nombre_empresa || 'Empresa',
            title: anuncio.titulo || 'Posición disponible',
            salary: anuncio.salario ? `$${anuncio.salario.toLocaleString()} MXN` : 'Salario competitivo',
            img: `https://picsum.photos/300/150?random=${index + 100}`,
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

  // Abre modal si no hay sesión
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

  openJob() {
    const token = this.authApi.getToken();
    if (token) {
      this.router.navigate(['/jobs']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  openFeaturedJob() {
    const token = this.authApi.getToken();
    if (token) {
      this.router.navigate(['/jobs']);
    } else {
      this.router.navigate(['/login']);
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
}