import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';


// Estructura de cada tarjeta del carrusel principal.
interface Slide {
  company: string;
  companyDescription: string;
  title: string;
  salary: string;
  location: string;
  mode: string;
  description: string;
  img: string;
}

// Estructura de cada tarjeta de empleo del grid.
interface Job {
  company: string;
  title: string;
  salary: string;
  img: string;
  rating: string;
  applicants: number;
}

// Estructura de cada servicio mostrado en desktop y en la burbuja movil.
interface Service {
  title: string;
  description: string;
  img: string;
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
    private api: ApiService
  ) {}

  servicesOpen = false;
  menuOpen = false;
  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 52;
  isMobile = false;

  private slideIntervalId?: ReturnType<typeof setInterval>;

  slides: Slide[] = [
    {
      company: 'Lucky Ghost',
      companyDescription: 'Tienda de ropa con identidad visual fuerte y enfoque en streetwear.',
      title: 'Asesor de Ventas',
      salary: '$12,500 MXN',
      location: 'Ciudad de Mexico',
      mode: 'Presencial',
      description: 'Atencion a clientes, acomodo de prendas y apoyo general en tienda.',
      img: this.createLuckyGhostImage()
    },
    {
      company: 'Chambee Tech',
      companyDescription: 'Area especializada en APIs, datos y plataformas escalables.',
      title: 'Backend Developer',
      salary: '$25,000 MXN',
      location: 'Guadalajara',
      mode: 'Hibrido',
      description: 'Desarrollo con Node.js y PostgreSQL.',
      img: 'https://picsum.photos/900/320?random=32'
    },
    {
      company: 'Chambee Creative',
      companyDescription: 'Estudio interno para experiencias de producto y marca.',
      title: 'UI/UX Designer',
      salary: '$18,000 MXN',
      location: 'Monterrey',
      mode: 'Presencial',
      description: 'Disena experiencias modernas.',
      img: 'https://picsum.photos/900/320?random=33'
    }
  ];

  private createLuckyGhostImage(): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 320">
        <rect width="900" height="320" fill="#efe9dd"/>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  services: Service[] = [
    { title: 'Servicio 1', description: 'Descripcion breve', img: 'https://picsum.photos/80/80?1' },
    { title: 'Servicio 2', description: 'Descripcion breve', img: 'https://picsum.photos/80/80?2' },
    { title: 'Servicio 3', description: 'Descripcion breve', img: 'https://picsum.photos/80/80?3' },
    { title: 'Servicio 4', description: 'Descripcion breve', img: 'https://picsum.photos/80/80?4' },
    { title: 'Servicio 5', description: 'Descripcion breve', img: 'https://picsum.photos/80/80?5' },
    { title: 'Servicio 6', description: 'Descripcion breve', img: 'https://picsum.photos/80/80?6' }
  ];

  // Datos de ejemplo para los empleos mostrados en el grid. En un futuro, estos datos deberían ser obtenidos desde el backend.
  jobs: Job[] = [
    { company: 'AT&T Mexico', title: 'Ejecutivo de Ventas', salary: '$13,000 MXN', img: 'https://picsum.photos/300/150', rating: '4.2', applicants: 9 },
    { company: 'Google', title: 'Frontend Developer', salary: '$25,000 MXN', img: 'https://picsum.photos/301/150', rating: '4.8', applicants: 12 },
    { company: 'Amazon', title: 'Backend Developer', salary: '$30,000 MXN', img: 'https://picsum.photos/302/150', rating: '4.7', applicants: 7 },
    { company: 'Spotify', title: 'Mobile Engineer', salary: '$28,000 MXN', img: 'https://picsum.photos/303/150', rating: '4.6', applicants: 5 },
    { company: 'Microsoft', title: 'Cloud Engineer', salary: '$32,000 MXN', img: 'https://picsum.photos/304/150', rating: '4.9', applicants: 10 },
    { company: 'IBM', title: 'Data Scientist', salary: '$26,000 MXN', img: 'https://picsum.photos/305/150', rating: '4.5', applicants: 6 },
    { company: 'Oracle', title: 'DevOps Engineer', salary: '$29,500 MXN', img: 'https://picsum.photos/306/150', rating: '4.4', applicants: 8 },
    { company: 'Apple', title: 'iOS Developer', salary: '$34,000 MXN', img: 'https://picsum.photos/307/150', rating: '4.9', applicants: 11 }
  ];

  ngOnInit() {
    this.slideIntervalId = setInterval(() => this.nextSlide(), 9000);
    this.checkMobile();
    this.fillJobsToMax();

    const token = this.api.getToken();

    if (token) {
      const usuario = this.api.getUsuario();

      if (usuario.rol === "empleador") {
        this.router.navigate(['/home-employer'])
      }
    }
  }

  ngOnDestroy() {
    if (this.slideIntervalId) clearInterval(this.slideIntervalId);
  }

  get visibleServices(): Service[] {
    return this.servicesOpen ? this.services : this.services.slice(0, 4);
  }

  toggleServices() { this.servicesOpen = !this.servicesOpen; }
  toggleMenu() { this.menuOpen = !this.menuOpen; }
  toggleTheme() { this.themeService.toggleTheme(); }
  get isDarkMode(): boolean { return this.themeService.isDarkMode(); }

  openService(i: number) { void i; this.router.navigate(['/login']); }
  openJob() { this.router.navigate(['/login']); }
  openFeaturedJob() { this.router.navigate(['/login']); }

  @HostListener('window:resize')
  onResize() { this.checkMobile(); }

  checkMobile() { this.isMobile = window.innerWidth <= 768; }

  
  fillJobsToMax() {
    const baseJobs = [...this.jobs];
    let index = 0;

    while (this.jobs.length < this.maxVisible) {
      const baseJob = baseJobs[index % baseJobs.length];
      const imageSeed = this.jobs.length + 1;

      this.jobs.push({
        ...baseJob,
        company: `${baseJob.company} ${this.jobs.length + 1}`,
        img: `https://picsum.photos/300/150?random=${imageSeed}`
      });

      index++;
    }
  }

  showMoreJobs() { this.visibleCount += 8; }

  nextSlide() { this.currentSlide = (this.currentSlide + 1) % this.slides.length; }
  prevSlide() { this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length; }
  goToSlide(i: number) { this.currentSlide = i; }

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
          alert("Mensaje enviado correctamente ");
          form.resetForm({
            nombreCompleto: '',
            empresa: '',
            telefono: '',
            correo: '',
            asunto: '',
            detalles: ''
          });
        },
        error: () => alert("Error al enviar ")
      });
  }
}
