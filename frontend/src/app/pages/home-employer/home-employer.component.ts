import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
// Importa tu servicio de tema si lo tienes en esta ruta, si no, ajusta el path:
// import { ThemeService } from '../../services/theme.service'; 

interface RecentApplicant {
  name: string;
  appliedFor: string;
  profession: string;
  experience: string;
  description: string;
  profilePic: string;
  timeAgo: string;
}

interface Applicant {
  name: string;
  appliedFor: string;
  description: string;
  skills: string;
  profilePic: string;
  dateApplied: string;
}

interface Anuncio {
  titulo: string;
  ubicacion: string;
  fechaPublicacion: string;
  candidatos: number;
  estado: string;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-home-employer',
  standalone: true,
  imports: [CommonModule, RouterModule], // Fundamentales para *ngIf, *ngFor y routerLink
  templateUrl: './home-employer.component.html',
  styleUrl: './home-employer.component.css'
})
export class HomeEmployerComponent implements OnInit, OnDestroy {
  // Variables de la empresa
  nombre_empleador: string = 'Tech Solutions'; 

  // Control de la interfaz
  toolsOpen = false;
  menuOpen = false;
  notificationsOpen = false; 
  hasUnreadNotifications = true; 
  isDarkMode = false; // Manejo local temporal si no inyectas el ThemeService

  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 28;
  isMobile = false;

  private slideIntervalId?: ReturnType<typeof setInterval>;

  // Notificaciones simuladas
  notifications: NotificationItem[] = [
    { id: 1, title: 'Nuevo candidato destacado', message: 'Carlos R. aplicó a Fullstack Dev.', time: 'Hace 5 min', read: false },
    { id: 2, title: 'Plan de facturación', message: 'Tu factura de este mes ya está disponible.', time: 'Hace 2 horas', read: false },
    { id: 3, title: 'Bienvenido a Chambee', message: 'Publica tu primera vacante para empezar.', time: 'Hace 1 día', read: true }
  ];

  // Postulantes para el carrusel superior
  recentApplicants: RecentApplicant[] = [
    {
      name: 'Carlos R.',
      appliedFor: 'Fullstack Developer',
      profession: 'Ingeniero en Sistemas',
      experience: '3 años',
      description: 'Desarrollador enfocado en aplicaciones web escalables utilizando Angular y bases de datos relacionales como PostgreSQL.',
      profilePic: 'https://i.pravatar.cc/150?img=11',
      timeAgo: 'Hace 2 horas'
    },
    {
      name: 'Mariana Gómez',
      appliedFor: 'UI/UX Designer',
      profession: 'Diseñadora Interactiva',
      experience: '5 años',
      description: 'Especialista en interfaces de usuario limpias y sistemas de diseño para aplicaciones móviles.',
      profilePic: 'https://i.pravatar.cc/150?img=5',
      timeAgo: 'Hace 5 horas'
    },
    {
      name: 'Luis Fernando',
      appliedFor: 'Asesor de Ventas',
      profession: 'Lic. en Administración',
      experience: '2 años',
      description: 'Experiencia en atención al cliente, alcance de metas mensuales y manejo de inventario en retail.',
      profilePic: 'https://i.pravatar.cc/150?img=15',
      timeAgo: 'Hace 1 día'
    }
  ];

  // --- NUEVA VARIABLE: Anuncios de la Empresa ---
  misAnuncios: Anuncio[] = [
    {
      titulo: 'Desarrollador Frontend (Angular)',
      ubicacion: 'San Miguel de Allende',
      fechaPublicacion: 'Hace 2 días',
      candidatos: 5,
      estado: 'Activa'
    },
    {
      titulo: 'Diseñador Gráfico Jr.',
      ubicacion: 'Remoto',
      fechaPublicacion: 'Hace 1 semana',
      candidatos: 12,
      estado: 'Cerrada'
    },
    {
      titulo: 'Analista de Base de Datos (PostgreSQL)',
      ubicacion: 'Híbrido',
      fechaPublicacion: 'Hace 3 semanas',
      candidatos: 8,
      estado: 'Activa'
    }
  ];

  // Todos los postulantes para el grid inferior
  allApplicants: Applicant[] = [
    { name: 'Andrea López', appliedFor: 'Backend Developer', description: 'Experta en Node.js y APIs RESTful. Apasionada por el código limpio.', skills: 'Node.js • Express • MongoDB', profilePic: 'https://i.pravatar.cc/150?img=1', dateApplied: 'Hoy' },
    { name: 'Miguel Torres', appliedFor: 'Ejecutivo de Ventas', description: 'Historial comprobado de superar cuotas de ventas B2B.', skills: 'Ventas B2B • CRM • Negociación', profilePic: 'https://i.pravatar.cc/150?img=12', dateApplied: 'Ayer' },
    { name: 'Sofía Ruiz', appliedFor: 'Frontend Developer', description: 'Desarrollo de SPAs rápidas y accesibles con frameworks modernos.', skills: 'Angular • TypeScript • Tailwind', profilePic: 'https://i.pravatar.cc/150?img=9', dateApplied: 'Ayer' },
    { name: 'Jorge Pérez', appliedFor: 'Data Scientist', description: 'Análisis predictivo y visualización de datos complejos.', skills: 'Python • Pandas • PostgreSQL', profilePic: 'https://i.pravatar.cc/150?img=13', dateApplied: 'Hace 2 días' },
    { name: 'Daniela Castro', appliedFor: 'DevOps Engineer', description: 'Automatización de despliegues y gestión de nubes en AWS.', skills: 'AWS • Docker • CI/CD', profilePic: 'https://i.pravatar.cc/150?img=20', dateApplied: 'Hace 2 días' },
    { name: 'Roberto Díaz', appliedFor: 'Mobile Engineer', description: 'Creación de aplicaciones nativas para iOS.', skills: 'Swift • iOS • Firebase', profilePic: 'https://i.pravatar.cc/150?img=14', dateApplied: 'Hace 3 días' },
    { name: 'Elena Martínez', appliedFor: 'Cloud Engineer', description: 'Migración y mantenimiento de infraestructuras en Azure.', skills: 'Azure • Kubernetes • Terraform', profilePic: 'https://i.pravatar.cc/150?img=22', dateApplied: 'Hace 4 días' },
    { name: 'Hugo Sánchez', appliedFor: 'UI/UX Designer', description: 'Diseño centrado en el usuario e investigación UX.', skills: 'Figma • Prototipado • Wireframing', profilePic: 'https://i.pravatar.cc/150?img=18', dateApplied: 'Hace 5 días' }
  ];

  constructor(
    private readonly router: Router
    // private readonly themeService: ThemeService // Descomenta si usas el servicio
  ) {}

  ngOnInit() {
    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);
    this.checkMobile();
    this.fillApplicantsToMax();

        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      this.nombre_empleador = usuario.nombre || 'Usuario';
  }

  ngOnDestroy() {
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
    }
  }

  // --- LÓGICA DE NOTIFICACIONES ---
  toggleNotifications(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen = !this.notificationsOpen;
    
    if (this.notificationsOpen) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);
    }
    this.menuOpen = false; 
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick() {
    if (this.notificationsOpen) {
      this.notificationsOpen = false;
    }
  }

  // --- CONTROL DE PANELES (Ahora para Mis Anuncios) ---
  toggleTools() {
    this.toolsOpen = !this.toolsOpen;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  toggleTheme() {
    // Si tienes el ThemeService inyectado, usa: this.themeService.toggleTheme();
    // Por ahora lo manejamos de forma local para que no te tire error
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  // --- ACCIONES ---
  viewCV(applicant: any) {
    console.log('Abriendo CV de:', applicant.name);
  }

  logout() {
    // 1. Opcional: Aquí puedes limpiar el localStorage si guardas datos de sesión de tu backend en PostgreSQL
    // localStorage.removeItem('token');
    
    // 2. Cerramos los menús 
    this.menuOpen = false;
    this.toolsOpen = false;
    
    // 3. Redirigimos a la página principal o de login
    console.log('Cerrando sesión...');
    this.router.navigate(['/']); // Cambia '/' por tu ruta de login si la tienes
  }

  // --- RESPONSIVE Y UTILIDADES ---
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

  // Rellena la lista para el botón de "Cargar más"
  fillApplicantsToMax() {
    const baseApplicants = [...this.allApplicants];
    let index = 0;

    while (this.allApplicants.length < this.maxVisible) {
      const baseApp = baseApplicants[index % baseApplicants.length];
      const imageSeed = this.allApplicants.length + 30; 
      this.allApplicants.push({
        ...baseApp,
        name: `${baseApp.name} (Copia)`,
        profilePic: `https://i.pravatar.cc/150?img=${imageSeed % 70}`
      });
      index++;
    }
  }

  showMoreApplicants() {
    this.visibleCount = Math.min(this.visibleCount + 8, this.maxVisible);
  }

  // --- CARRUSEL ---
  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.recentApplicants.length;
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.recentApplicants.length) % this.recentApplicants.length;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
  }
}