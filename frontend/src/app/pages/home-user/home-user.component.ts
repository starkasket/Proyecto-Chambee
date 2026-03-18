import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
// Asegúrate de que la ruta a tu ThemeService sea la correcta según tus carpetas
import { ThemeService } from '../../services/theme.service';

// Interfaces para estructurar los datos
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

interface Job {
  company: string;
  title: string;
  salary: string;
  img: string;
  rating: string;
  applicants: number;
}

interface Service {
  title: string;
  description: string;
  img: string;
}

@Component({
  selector: 'app-home-user',
  standalone: true,
  imports: [CommonModule, RouterModule], // Muy importante importar estos módulos
  templateUrl: './home-user.component.html',
  styleUrl: './home-user.component.css'
})
export class HomeUserComponent implements OnInit, OnDestroy {
  // Aquí está el nombre del usuario para el mensaje de bienvenida
  nombre_postulante: string = 'Usuario'; 

  servicesOpen = false;
  menuOpen = false;
  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 28;
  isMobile = false;

  private slideIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly router: Router,
    private readonly themeService: ThemeService
  ) {}

  // Datos del carrusel destacado
  slides: Slide[] = [
    {
      company: 'Lucky Ghost',
      companyDescription: 'Tienda de ropa con identidad visual fuerte y enfoque en streetwear.',
      title: 'Asesor de Ventas',
      salary: '$12,500 MXN',
      location: 'Ciudad de México',
      mode: 'Presencial',
      description: 'Atención a clientes, acomodo de prendas y apoyo general en tienda.',
      img: this.createLuckyGhostImage()
    },
    {
      company: 'Chambee Tech',
      companyDescription: 'Área especializada en APIs, datos y plataformas escalables.',
      title: 'Backend Developer',
      salary: '$25,000 MXN',
      location: 'Guadalajara',
      mode: 'Híbrido',
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
      description: 'Diseña experiencias modernas.',
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

  services: Service[] = [
    { title: 'Servicio 1', description: 'Descripción breve del servicio 1', img: 'https://picsum.photos/80/80?random=1' },
    { title: 'Servicio 2', description: 'Descripción breve del servicio 2', img: 'https://picsum.photos/80/80?random=2' },
    { title: 'Servicio 3', description: 'Descripción breve del servicio 3', img: 'https://picsum.photos/80/80?random=3' },
    { title: 'Servicio 4', description: 'Descripción breve del servicio 4', img: 'https://picsum.photos/80/80?random=4' },
    { title: 'Servicio 5', description: 'Descripción breve del servicio 5', img: 'https://picsum.photos/80/80?random=5' },
    { title: 'Servicio 6', description: 'Descripción breve del servicio 6', img: 'https://picsum.photos/80/80?random=6' }
  ];

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
    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);
    this.checkMobile();
    this.fillJobsToMax();
  }

  ngOnDestroy() {
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
    }
  }

  get visibleServices(): Service[] {
    return this.servicesOpen ? this.services : this.services.slice(0, 4);
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

  // Como el usuario ya está logueado, podríamos mandarlo a ver los detalles en vez de al login
  openService(index: number) {
    console.log('Abriendo servicio:', index);
    // this.router.navigate(['/service-details', index]); 
  }

  openJob() {
    console.log('Abriendo detalle de empleo');
    // this.router.navigate(['/job-details']);
  }

  openFeaturedJob() {
    console.log('Abriendo empleo destacado');
    // this.router.navigate(['/job-details']);
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

  showMoreJobs() {
    this.visibleCount = Math.min(this.visibleCount + 8, this.maxVisible);
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
  }
}