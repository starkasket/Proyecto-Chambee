import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
// Importa tu servicio de tema si lo tienes en esta ruta, si no, ajusta el path:
// import { ThemeService } from '../../services/theme.service'; 

interface Applicant {
  id: string;
  applicationId?: string;
  name: string;
  appliedFor: string;
  description: string;
  skills?: string;
  profilePic: string;
  dateApplied?: string;
  cvUrl?: string;
  email?: string;
  phone?: string;
  location?: string;
}

interface RecentApplicant extends Applicant {
  profession: string;
  experience: string;
  timeAgo: string;
}

interface Anuncio {
  id?: string;
  titulo: string;
  ubicacion: string;
  fechaPublicacion: string;
  candidatos: number;
  estado: string;
  descripcion?: string;
  modalidad?: string;
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
  nombre_empleador: string = 'Empresa';
  foto_perfil: string = '';

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
      id: '201',
      name: 'Carlos R.',
      appliedFor: 'Fullstack Developer',
      profession: 'Ingeniero en Sistemas',
      experience: '3 años',
      description: 'Desarrollador enfocado en aplicaciones web escalables utilizando Angular y bases de datos relacionales como PostgreSQL.',
      skills: 'Angular • Node.js • PostgreSQL',
      profilePic: 'https://i.pravatar.cc/150?img=11',
      dateApplied: 'Hoy',
      timeAgo: 'Hace 2 horas'
    },
    {
      id: '202',
      name: 'Mariana Gómez',
      appliedFor: 'UI/UX Designer',
      profession: 'Diseñadora Interactiva',
      experience: '5 años',
      description: 'Especialista en interfaces de usuario limpias y sistemas de diseño para aplicaciones móviles.',
      skills: 'UI/UX • Figma • Prototipos',
      profilePic: 'https://i.pravatar.cc/150?img=5',
      dateApplied: 'Ayer',
      timeAgo: 'Hace 5 horas'
    },
    {
      id: '203',
      name: 'Luis Fernando',
      appliedFor: 'Asesor de Ventas',
      profession: 'Lic. en Administración',
      experience: '2 años',
      description: 'Experiencia en atención al cliente, alcance de metas mensuales y manejo de inventario en retail.',
      skills: 'Ventas • CRM • Negociación',
      profilePic: 'https://i.pravatar.cc/150?img=15',
      dateApplied: 'Hace 1 día',
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
  allApplicants: Applicant[] = [];
  sampleApplicants: Applicant[] = [
    { id: '101', name: 'Andrea López', appliedFor: 'Backend Developer', description: 'Experta en Node.js y APIs RESTful. Apasionada por el código limpio.', skills: 'Node.js • Express • MongoDB', profilePic: 'https://i.pravatar.cc/150?img=1', dateApplied: 'Hoy', cvUrl: 'https://example.com/cv-andrea-lopez.pdf', email: 'andrea.lopez@example.com', phone: '+52 1 55 1234 5678' },
    { id: '102', name: 'Miguel Torres', appliedFor: 'Ejecutivo de Ventas', description: 'Historial comprobado de superar cuotas de ventas B2B.', skills: 'Ventas B2B • CRM • Negociación', profilePic: 'https://i.pravatar.cc/150?img=12', dateApplied: 'Ayer', cvUrl: 'https://example.com/cv-miguel-torres.pdf', email: 'miguel.torres@example.com', phone: '+52 1 55 8765 4321' },
    { id: '103', name: 'Sofía Ruiz', appliedFor: 'Frontend Developer', description: 'Desarrollo de SPAs rápidas y accesibles con frameworks modernos.', skills: 'Angular • TypeScript • Tailwind', profilePic: 'https://i.pravatar.cc/150?img=9', dateApplied: 'Ayer', cvUrl: 'https://example.com/cv-sofia-ruiz.pdf', email: 'sofia.ruiz@example.com', phone: '+52 1 55 2222 3333' },
    { id: '104', name: 'Jorge Pérez', appliedFor: 'Data Scientist', description: 'Análisis predictivo y visualización de datos complejos.', skills: 'Python • Pandas • PostgreSQL', profilePic: 'https://i.pravatar.cc/150?img=13', dateApplied: 'Hace 2 días', cvUrl: 'https://example.com/cv-jorge-perez.pdf', email: 'jorge.perez@example.com', phone: '+52 1 55 4444 5555' },
    { id: '105', name: 'Daniela Castro', appliedFor: 'DevOps Engineer', description: 'Automatización de despliegues y gestión de nubes en AWS.', skills: 'AWS • Docker • CI/CD', profilePic: 'https://i.pravatar.cc/150?img=20', dateApplied: 'Hace 2 días', cvUrl: '', email: '', phone: '' }
   ];

  constructor(
    private readonly router: Router,
    private readonly api: ApiService,
    private readonly authApi: AuthService
    // private readonly themeService: ThemeService // Descomenta si usas el servicio
  ) { }

  ngOnInit() {
    // 1. Obtener datos del usuario guardados en localStorage/sessionStorage
    const usuario = this.api.getUsuario();

    // 2. Cargar nombre de empresa ACTUALIZADO desde la BASE DE DATOS (no del localStorage)
    // Esto asegura que si el nombre se cambió en el perfil, aparezca actualizado en la navbar
    if (usuario?.id) {
      // Hacer petición HTTP a la API para obtener perfil fresco de la BD
      this.api.getMiPerfil().subscribe({
        // Si la petición es exitosa
        next: (perfil: any) => {
          // Asignar nombre de empresa desde la respuesta de la API (siempre actualizado)
          this.nombre_empleador = perfil?.nombre_empresa || 'Usuario';
          this.foto_perfil = perfil?.foto_perfil || '';
        },
        // Si la petición falla (error de conexión, timeout, etc)
        error: () => {
          // Usar el nombre guardado en localStorage como fallback
          this.nombre_empleador = usuario?.nombre || 'Usuario';
        }
      });
      // Cargar anuncios publicados por esta empresa
      this.cargarAnuncios(usuario.id);
      this.cargarPostulantes();
    } else {
      // Si no tiene ID de usuario, usar fallback
      this.nombre_empleador = usuario?.nombre || 'Usuario';
    }

    // 3. Inicializar carrusel de postulantes (cambia cada 9 segundos)
    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);

    // 4. Detectar si es mobile para responsive design
    this.checkMobile();
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
  viewProfile(applicant: Applicant) {
    if (!applicant?.id) {
      alert('El perfil del postulante no está disponible.');
      return;
    }

    this.router.navigate(['/perfil-postulante', applicant.id]);
  }

  viewCV(applicant: Applicant) {
    if (applicant.cvUrl) {
      window.open(applicant.cvUrl, '_blank');
      return;
    }

    alert('CV no disponible para este postulante.');
  }

  logout() {
    this.authApi.logout();

    // 2. Cerramos los menús 
    this.menuOpen = false;
    this.toolsOpen = false;

    console.log('Cerrando sesión...');

  }

  crearOferta() {
    // this.router.navigate(['/post-job']);
    this.router.navigate(['/post-job']);

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

  private cargarAnuncios(idEmpleador: string) {
    // Cuando hay anuncios reales en BD, reemplazamos el contenido demo del panel.
    this.api.obtenerAnunciosEmpleador(idEmpleador).subscribe({
      next: (anunciosDb) => {
        if (!anunciosDb.length) {
          return;
        }

        this.misAnuncios = anunciosDb.map((anuncio) => ({
          id: anuncio.id_anuncio,
          titulo: anuncio.titulo,
          ubicacion: `${anuncio.ciudad}, ${anuncio.estado}`,
          fechaPublicacion: this.formatearFecha(anuncio.fecha_publicacion),
          candidatos: anuncio.postulaciones_count ?? anuncio.vistas ?? 0,
          estado: this.mapAnnouncementState(anuncio.estado_anuncio),
          descripcion: anuncio.descripcion,
          modalidad: anuncio.modalidad
        }));
      },
      error: () => {
        // Si falla el backend, se mantiene la experiencia con los datos simulados.
      }
    });
  }

  private mapAnnouncementState(estado: string): string {
    if (estado === 'ACTIVO') return 'Activa';
    if (estado === 'BORRADOR') return 'Borrador';
    return 'Oculta';
  }

  private formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return 'Recien publicada';
    }

    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private cargarPostulantes() {
    const usuario = this.api.getUsuario();
    if (!usuario?.id) {
      this.allApplicants = [...this.sampleApplicants];
      return;
    }

    this.api.obtenerPostulacionesEmpleador(usuario.id).subscribe({
      next: (postulaciones: any[]) => {
        if (!Array.isArray(postulaciones) || postulaciones.length === 0) {
          this.allApplicants = [...this.sampleApplicants];
          return;
        }

        this.allApplicants = postulaciones.map((item, index) => ({
          id: item.id_postulante || item.id_postulacion || `p-${index}`,
          applicationId: item.id_postulacion,
          name: `${item.nombre_postulante || ''} ${item.apellido_paterno_postulante || ''}`.trim(),
          appliedFor: item.vacante || 'Vacante desconocida',
          description: item.perfil_postulante || 'Candidato interesado.',
          skills: item.perfil_postulante ? item.perfil_postulante.slice(0, 90) : 'Detalle no disponible',
          profilePic: item.foto_perfil || `https://i.pravatar.cc/150?img=${index + 30}`,
          dateApplied: item.fecha_postulacion ? new Date(item.fecha_postulacion).toLocaleDateString('es-MX') : 'Reciente',
          cvUrl: item.archivo_cv ?? null,
          email: item.correo_electronico || 'No disponible',
          phone: item.telefono || 'No disponible'
        }));

        console.log(postulaciones);
        
        if (this.allApplicants.length > 0) {
          this.recentApplicants = this.allApplicants.slice(0, 3).map((item) => ({
            ...item,
            profession: item.appliedFor,
            experience: 'Nuevo',
            timeAgo: 'Reciente'
          } as RecentApplicant));
        }
      },
      error: (err) => {
        console.error('Error cargando postulaciones del empleador:', err);
        this.allApplicants = [...this.sampleApplicants];
      }
    });
  }

  // --- CARRUSEL ---
  nextSlide() {
    if (!this.recentApplicants.length) {
      return;
    }
    this.currentSlide = (this.currentSlide + 1) % this.recentApplicants.length;
  }

  prevSlide() {
    if (!this.recentApplicants.length) {
      return;
    }
    this.currentSlide = (this.currentSlide - 1 + this.recentApplicants.length) % this.recentApplicants.length;
  }

  goToSlide(index: number) {
    if (index < 0 || index >= this.recentApplicants.length) {
      return;
    }
    this.currentSlide = index;
  }
}
