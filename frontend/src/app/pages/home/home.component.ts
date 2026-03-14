import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

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
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  // Controla si la lista de servicios esta expandida.
  servicesOpen = false;

  // Controla la apertura del menu hamburguesa.
  menuOpen = false;

  // Indice actual del carrusel principal.
  currentSlide = 0;

  // Cantidad de empleos visibles en el grid.
  visibleCount = 8;

  // Limite maximo de empleos generados para la vista.
  maxVisible = 28;

  // Se usa para alternar entre layout desktop y movil.
  isMobile = false;

  // Referencia al intervalo del carrusel para limpiarlo al destruir el componente.
  private slideIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly router: Router,
    private readonly themeService: ThemeService
  ) {}

  // Slides principales del carrusel destacado.
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
        <g transform="translate(390 28)">
          <path d="M72 10c29 0 52 24 52 54 0 29-12 56-21 73-8 15-6 31 4 47-13-1-24-8-31-18-10 12-27 13-39 4-8-6-18-7-27-3 9-15 12-30 4-43C3 112-8 89-8 64-8 34 15 10 44 10c11 0 21 4 28 11 7-7 17-11 28-11Z" fill="none" stroke="#111" stroke-width="8" stroke-linejoin="round"/>
          <ellipse cx="40" cy="63" rx="8" ry="13" fill="#111"/>
          <ellipse cx="80" cy="63" rx="8" ry="13" fill="#111"/>
          <ellipse cx="60" cy="95" rx="9" ry="15" fill="#111"/>
        </g>
        <text x="450" y="200" text-anchor="middle" font-size="92" font-family="Georgia, Times New Roman, serif" font-weight="700" fill="#111">LUCKY GHOST</text>
        <text x="450" y="266" text-anchor="middle" font-size="50" font-family="Georgia, Times New Roman, serif" font-weight="700" letter-spacing="8" fill="#111">CLOTHES</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  // Servicios mostrados en la columna desktop o panel flotante movil.
  services: Service[] = [
    {
      title: 'Servicio 1',
      description: 'Descripcion breve del servicio 1',
      img: 'https://picsum.photos/80/80?random=1'
    },
    {
      title: 'Servicio 2',
      description: 'Descripcion breve del servicio 2',
      img: 'https://picsum.photos/80/80?random=2'
    },
    {
      title: 'Servicio 3',
      description: 'Descripcion breve del servicio 3',
      img: 'https://picsum.photos/80/80?random=3'
    },
    {
      title: 'Servicio 4',
      description: 'Descripcion breve del servicio 4',
      img: 'https://picsum.photos/80/80?random=4'
    },
    {
      title: 'Servicio 5',
      description: 'Descripcion breve del servicio 5',
      img: 'https://picsum.photos/80/80?random=5'
    },
    {
      title: 'Servicio 6',
      description: 'Descripcion breve del servicio 6',
      img: 'https://picsum.photos/80/80?random=6'
    }
  ];

  // Empleos base del grid. Luego se duplican para completar el maximo visible.
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
    // Mueve automaticamente el carrusel cada 9 segundos.
    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);

    // Detecta el tipo de pantalla al cargar el componente.
    this.checkMobile();

    // Genera mas tarjetas para mantener el grid con varias filas.
    this.fillJobsToMax();
  }

  ngOnDestroy() {
    // Limpia el intervalo para evitar fugas de memoria.
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
    }
  }

  // En desktop muestra 4 servicios por defecto y todos cuando se expande.
  get visibleServices(): Service[] {
    return this.servicesOpen ? this.services : this.services.slice(0, 4);
  }

  // Abre o cierra la lista de servicios.
  toggleServices() {
    this.servicesOpen = !this.servicesOpen;
  }

  // Abre o cierra el menu hamburguesa.
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  // Alterna entre modo claro y oscuro.
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  // Se usa para renderizar el estado actual del switch.
  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  // Cualquier servicio redirige al login por ahora.
  openService(index: number) {
    void index;
    void this.router.navigate(['/login']);
  }

  // Cualquier tarjeta de empleo redirige al login por ahora.
  openJob() {
    void this.router.navigate(['/login']);
  }

  // El anuncio destacado tambien redirige al login.
  openFeaturedJob() {
    void this.router.navigate(['/login']);
  }

  // Recalcula el layout responsive al cambiar el tamano de la ventana.
  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  // Marca la vista como movil cuando el ancho es igual o menor a 768px.
  checkMobile() {
    try {
      this.isMobile = window.innerWidth <= 768;
    } catch {
      this.isMobile = false;
    }
  }

  // Alias mantenido por compatibilidad con posibles llamadas anteriores.
  loadMoreJobs() {
    this.showMoreJobs();
  }

  // Duplica empleos base hasta llegar al numero maximo permitido.
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

  // Incrementa el numero de empleos visibles al presionar "Ver mas".
  showMoreJobs() {
    this.visibleCount = Math.min(this.visibleCount + 8, this.maxVisible);
  }

  // Avanza al siguiente slide.
  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  // Regresa al slide anterior.
  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  // Permite ir directo a un slide desde los dots.
  goToSlide(index: number) {
    this.currentSlide = index;
  }
}
