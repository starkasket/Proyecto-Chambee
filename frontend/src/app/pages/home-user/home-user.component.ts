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
  id?: string | number;
  company: string;
  title: string;
  salary: string;
  img: string;
  urgency?: string;
  rating: string;
  applicants: number;
}

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
  
  nombre_postulante: string = 'Usuario';
  foto_perfil: string = '';

  // VARIABLES PARA EL CONTROL DE LA INTERFAZ
  servicesOpen = false;
  menuOpen = false;
  notificationsOpen = false; 
  hasUnreadNotifications = true; 

  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 8;
  isMobile = false;
  faqOpen: number | null = null;
  modalMensaje = '';

  private slideIntervalId?: ReturnType<typeof setInterval>;

  notifications: NotificationItem[] = [
    { id: 1, title: '¡Nueva postulación!', message: 'Tu perfil hace "match" con Google.', time: 'Hace 5 min', read: false },
    { id: 2, title: 'Mensaje de RRHH', message: 'Lucky Ghost ha revisado tu CV.', time: 'Hace 2 horas', read: false },
    { id: 3, title: 'Bienvenido a Chambee', message: 'Completa tu perfil para destacar más.', time: 'Hace 1 día', read: true }
  ];

  slides: Slide[] = [];
  jobs: Job[] = [];
  services: Service[] = [];

  constructor(
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private readonly http: HttpClient,
    private readonly api: ApiService,
    private readonly authApi: AuthService,
    private serviciosService: ServiciosService
  ) {}

  ngOnInit() {
    this.serviciosService.servicios$.subscribe((servicios: Service[]) => {
      this.services = servicios;
    });

    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);
    
    this.checkMobile();
    
    // Llamada clave para cargar vacantes
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

  // --- LÓGICA DE CARGA DE DATOS (CON DEBUGGING) ---
  private cargarOfertasPublicas() {
    console.log("Iniciando petición de vacantes al servidor...");

    this.api.obtenerAnunciosPublicos().subscribe({
      next: (anuncios) => {
        console.log("Respuesta del servidor recibida:", anuncios);

        // Validamos que sea un arreglo válido y tenga elementos
        if (!anuncios || !Array.isArray(anuncios) || anuncios.length === 0) {
          console.log("No hay vacantes activas en la base de datos.");
          this.slides = [];
          this.jobs = [];
          return;
        }

        // Mapeo del Carrusel (Máximo 5)
        const ofertas = anuncios.map((anuncio) => ({
          id: anuncio.id_anuncio,
          company: anuncio.nombre_empresa || 'Empresa Confidencial',
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

        // Mapeo del Grid de Empleos
        this.jobs = anuncios.map((anuncio) => ({
          id: anuncio.id_anuncio,
          company: anuncio.nombre_empresa || 'Empresa Confidencial',
          title: anuncio.titulo,
          salary: this.formatearSalario(anuncio.salario),
          img: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&auto=format&fit=crop&q=60',
          urgency: anuncio.urgencia || 'Normal',
          rating: anuncio.modalidad || 'Empleo',
          applicants: anuncio.vistas || 0
        }));

        this.currentSlide = 0;
        this.maxVisible = Math.max(8, this.jobs.length);
        this.visibleCount = Math.min(8, this.maxVisible);
        
        console.log("Las vacantes se cargaron correctamente en la interfaz.");
      },
      error: (err) => {
        console.error("ERROR AL PEDIR VACANTES AL SERVIDOR:", err);
        this.slides = [];
        this.jobs = [];
      }
    });
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

  // --- LÓGICA DE NAVEGACIÓN ---
  irAlPerfil() {
    this.menuOpen = false; 
    this.router.navigate(['/perfil-postulante']);
  }

  openJob(id?: string | number) {
    if (id) {
      this.router.navigate(['/job', id]);
    } else {
      console.warn('Falta el ID de este empleo.');
    }
  }

  openFeaturedJob(id?: string | number) {
    if (id) {
      this.router.navigate(['/job', id]);
    } else {
      console.warn('Falta el ID de este empleo destacado.');
    }
  }

  // --- LÓGICA DE INTERFAZ Y MODALES ---
  toggleNotifications(event?: Event) {
    if (event) event.stopPropagation(); 
    this.notificationsOpen = !this.notificationsOpen;
    
    if (this.notificationsOpen) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);
    }
    this.menuOpen = false; 
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick() {
    if (this.notificationsOpen) this.notificationsOpen = false;
  }

  logout() {
    this.authApi.logout();    
    this.menuOpen = false;
    this.servicesOpen = false;
  }

  irACrearServicio() {
    this.router.navigate(['/crear-servicio']);
  }

  get visibleServices(): Service[] {
    return this.servicesOpen ? this.services : this.services.slice(0, 4);
  }

  toggleServices() { this.servicesOpen = !this.servicesOpen; }
  toggleMenu() { 
    this.menuOpen = !this.menuOpen; 
    this.notificationsOpen = false; 
  }
  toggleTheme() { this.themeService.toggleTheme(); }
  get isDarkMode(): boolean { return this.themeService.isDarkMode(); }

  openService(index: number) { console.log('Abriendo servicio:', index); }

  @HostListener('window:resize')
  onResize() { this.checkMobile(); }

  checkMobile() {
    try { this.isMobile = window.innerWidth <= 768; } 
    catch { this.isMobile = false; }
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
    if (modal) { modal.classList.add('show'); modal.style.display = 'flex'; }
  }

  cerrarModal() {
    const modal = document.getElementById('modalAlerta');
    if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; }
  }

  mostrarModalExito(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalSaludo');
    if (modal) { modal.classList.add('show'); modal.style.display = 'flex'; }
  }

  cerrarModalExito() {
    const modal = document.getElementById('modalSaludo');
    if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; }
  }
}