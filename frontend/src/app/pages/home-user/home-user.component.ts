import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ServiciosService, Service } from '../../services/servicios.service';

// Interfaces para estructurar los datos
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
  id?: string;
  company: string;
  title: string;
  salary: string;
  img: string;
  urgency?: string;
  rating: string;
  applicants: number;
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
  nombre_postulante: string = 'Usuario';
  foto_perfil: string = '';

  // VARIABLES PARA EL CONTROL DE LA INTERFAZ
  servicesOpen = false;
  menuOpen = false;
  notificationsOpen = false; // Controla si el menú desplegable está abierto
  hasUnreadNotifications = true; // Controla el puntito rojo

  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 8;
  isMobile = false;
  faqOpen: number | null = null;
  modalMensaje = '';

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
    private readonly authApi: AuthService,
    private serviciosService: ServiciosService
  ) {}

  slides: Slide[] = [];

  services: Service[] = [
    { title: 'Servicio 1', description: 'Descripción breve del servicio 1', img: 'https://picsum.photos/80/80?random=1' },
    { title: 'Servicio 2', description: 'Descripción breve del servicio 2', img: 'https://picsum.photos/80/80?random=2' },
    { title: 'Servicio 3', description: 'Descripción breve del servicio 3', img: 'https://picsum.photos/80/80?random=3' },
    { title: 'Servicio 4', description: 'Descripción breve del servicio 4', img: 'https://picsum.photos/80/80?random=4' },
    { title: 'Servicio 5', description: 'Descripción breve del servicio 5', img: 'https://picsum.photos/80/80?random=5' },
    { title: 'Servicio 6', description: 'Descripción breve del servicio 6', img: 'https://picsum.photos/80/80?random=6' }
  ];

  jobs: Job[] = [];

  ngOnInit() {
    this.serviciosService.servicios$.subscribe((servicios: Service[]) => {
      this.services = servicios;
    });
    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);
    this.checkMobile();
    this.cargarOfertasPublicas();
    const usuario = this.api.getUsuario();

    if (usuario?.id) {
      this.api.getMiPerfil().subscribe({
        next: (perfil: any) =>  {
          this.nombre_postulante = perfil?.nombre_postulante || 'Usuario'
          this.foto_perfil = perfil?.foto_perfil || '';
        },
        error: () => {
          this.nombre_postulante = usuario?.nombre || 'Usuario'
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
    }
  }

  // --- LÓGICA PARA IR AL PERFIL ---
  irAlPerfil() {
    this.menuOpen = false; // Cerramos el menú por si está en mobile
    this.router.navigate(['/perfil-postulante']);
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

  openJob(id?: string | number) {
    console.log('Abriendo detalle de empleo de la cuadrícula con ID:', id);
    if (id) {
      this.router.navigate(['/job', id]);
    } else {
      console.warn('Este empleo no tiene ID (quizás es de los datos de prueba)');
    }
  }

  openFeaturedJob(id?: string | number) {
    console.log('Abriendo empleo del carrusel con ID:', id);
    if (id) {
      this.router.navigate(['/job', id]);
    } else {
      console.warn('Este empleo destacado no tiene ID (quizás es de los datos de prueba)');
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
          urgency: anuncio.urgencia || 'Normal',
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
          urgency: anuncio.urgencia || 'Normal',
          rating: anuncio.modalidad || 'Empleo',
          applicants: anuncio.vistas || 0
        }));

        this.currentSlide = 0;
        this.visibleCount = Math.min(8, Math.max(8, this.jobs.length));
        this.maxVisible = Math.max(8, this.jobs.length);
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
    if (!this.slides.length) {
      return;
    }
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    if (!this.slides.length) {
      return;
    }
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  goToSlide(index: number) {
    if (!this.slides.length) {
      return;
    }
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
            nombreCompleto: '',
            empresa: '',
            telefono: '',
            correo: '',
            asunto: '',
            detalles: ''
          });
          this.mostrarModalExito('Tu mensaje fue recibido. Te contactaremos a la brevedad.');
        },
        error: () => this.mostrarModal('Hubo un error al enviar tu mensaje. Inténtalo de nuevo.')
      });
  }

  // --- MODALES ---
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
}
