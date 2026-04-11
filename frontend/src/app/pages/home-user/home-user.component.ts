import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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
  id?: string;
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

// NUEVA INTERFAZ PARA NOTIFICACIONES
interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-home-user',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule], 
  templateUrl: './home-user.component.html',
  styleUrl: './home-user.component.css'
})
export class HomeUserComponent implements OnInit, OnDestroy {
  
  // Aquí está el nombre del usuario para el mensaje de bienvenida
  nombre_postulante = 'Usuario';

  
  // VARIABLES PARA EL CONTROL DE LA INTERFAZ
  servicesOpen = false;
  menuOpen = false;
  notificationsOpen = false; // Controla si el menú desplegable está abierto
  hasUnreadNotifications = true; // Controla el puntito rojo

  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 28;
  isMobile = false;
  faqOpen: number | null = null;

  private slideIntervalId?: ReturnType<typeof setInterval>;

  // NUEVOS DATOS DE NOTIFICACIONES SIMULADOS
  notifications: NotificationItem[] = [
    { id: 1, title: '¡Nueva postulación!', message: 'Tu perfil hace "match" con Google.', time: 'Hace 5 min', read: false },
    { id: 2, title: 'Mensaje de RRHH', message: 'Lucky Ghost ha revisado tu CV.', time: 'Hace 2 horas', read: false },
    { id: 3, title: 'Bienvenido a Chambee', message: 'Completa tu perfil para destacar más.', time: 'Hace 1 día', read: true }
  ];

  constructor(
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private readonly http: HttpClient,
    private readonly api: ApiService,
    private readonly authApi: AuthService
  ) {}

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
    this.cargarOfertasPublicas();
    const usuario = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}');
      this.nombre_postulante = usuario.nombre || 'Usuario';
  }

  ngOnDestroy() {
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
    }
  }

  // --- LÓGICA DEL MENÚ DE NOTIFICACIONES ---
  toggleNotifications(event?: Event) {
    if (event) {
      event.stopPropagation(); // Evita que se dispare el evento del documento
    }
    this.notificationsOpen = !this.notificationsOpen;
    
    // Si lo abrimos, quitamos el puntito rojo y marcamos todo como leído
    if (this.notificationsOpen) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);
    }
    
    // Cerramos el menú hamburguesa si estaba abierto
    this.menuOpen = false; 
  }

  // Esto cierra las notificaciones si das clic en cualquier otra parte de la pantalla
  @HostListener('document:click', ['$event'])
  onDocumentClick() {
    if (this.notificationsOpen) {
      this.notificationsOpen = false;
    }
  }
  // ------------------------------------------

  // --- LÓGICA DE CERRAR SESIÓN ---
  logout() {
    this.authApi.logout();    
    // Cerramos los menús
    this.menuOpen = false;
    this.servicesOpen = false;
    
    console.log('Cerrando sesión del usuario...');
   
  }

  // --- LÓGICA PARA CREAR NUEVO SERVICIO ---
  irACrearServicio() {
    this.router.navigate(['/crear-servicio']);
  }

  get visibleServices(): Service[] {
    return this.servicesOpen ? this.services : this.services.slice(0, 4);
  }

  toggleServices() {
    this.servicesOpen = !this.servicesOpen;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false; // Cierra notificaciones si abres el menú
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

  openJob() {
    console.log('Abriendo detalle de empleo');
  }

  openFeaturedJob() {
    console.log('Abriendo empleo destacado');
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

    if (!baseJobs.length) {
      return;
    }

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

  private cargarOfertasPublicas() {
    this.api.obtenerAnunciosPublicos().subscribe({
      next: (anuncios) => {
        if (!anuncios.length) {
          return;
        }

        const ofertas = anuncios.map((anuncio) => ({
          id: anuncio.id_anuncio,
          company: anuncio.nombre_empresa,
          companyDescription: anuncio.descripcion_empresa || 'Empresa activa en Chambee.',
          title: anuncio.titulo,
          salary: this.formatearSalario(anuncio.salario),
          location: `${anuncio.ciudad}, ${anuncio.estado}`,
          mode: anuncio.modalidad,
          description: anuncio.descripcion,
          img: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&auto=format&fit=crop&q=60'
        }));

        this.slides = ofertas.slice(0, Math.min(5, ofertas.length));

        this.jobs = anuncios.map((anuncio) => ({
          id: anuncio.id_anuncio,
          company: anuncio.nombre_empresa,
          title: anuncio.titulo,
          salary: this.formatearSalario(anuncio.salario),
          img: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&auto=format&fit=crop&q=60',
          rating: anuncio.modalidad || 'Empleo',
          applicants: anuncio.vistas || 0
        }));

        this.visibleCount = 8;
        this.maxVisible = Math.max(28, this.jobs.length);
        this.fillJobsToMax();
      },
      error: () => {
        // Si falla el backend se conservan los datos demo para no romper la vista.
      }
    });
  }

  private formatearSalario(salario: string | number): string {
    const numero = Number(salario);
    if (Number.isNaN(numero)) {
      return '$0 MXN';
    }

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(numero);
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
          alert('Mensaje enviado correctamente');
          form.resetForm({
            nombreCompleto: '',
            empresa: '',
            telefono: '',
            correo: '',
            asunto: '',
            detalles: ''
          });
        },
        error: () => alert('Error al enviar el mensaje')
      });
  }
}