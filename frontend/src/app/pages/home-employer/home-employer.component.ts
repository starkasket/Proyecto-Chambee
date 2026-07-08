import { Component, HostListener, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

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
  applicantId?: string; 
}

@Component({
  selector: 'app-home-employer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home-employer.component.html',
  styleUrl: './home-employer.component.css'
})
export class HomeEmployerComponent implements OnInit, OnDestroy {
  nombre_empleador: string = 'Empresa';
  foto_perfil: string = '';

  toolsOpen = false;
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = false; 
  isDarkMode = false; 

  currentSlide = 0;
  visibleCount = 8;
  maxVisible = 28;
  isMobile = false;

  private slideIntervalId?: ReturnType<typeof setInterval>;

  notifications: NotificationItem[] = [];

  recentApplicants: RecentApplicant[] = [];
  misAnuncios: Anuncio[] = [];
  allApplicants: Applicant[] = [];

  constructor(
    private readonly router: Router,
    private readonly api: ApiService,
    private readonly authApi: AuthService,
    private readonly socketService: SocketService,
    private readonly cdr: ChangeDetectorRef 
  ) { }

  ngOnInit() {
    this.cargarNotificaciones(); // <-- Cargar notificaciones al iniciar el componente

    const usuario = this.api.getUsuario();

    if (usuario?.id) {
      this.socketService.conectarEmpleador(usuario.id);

      this.socketService.escucharNuevasPostulaciones().subscribe((datosAlerta) => {
        this.agregarNotificacion(datosAlerta);
      });

      this.api.getMiPerfil().subscribe({
        next: (perfil: any) => {
          this.nombre_empleador = perfil?.nombre_empresa || 'Usuario';
          this.foto_perfil = perfil?.foto_perfil || '';
        },
        error: () => {
          this.nombre_empleador = usuario?.nombre || 'Usuario';
        }
      });
      this.cargarAnuncios(usuario.id);
      this.cargarPostulantes();
    } else {
      this.nombre_empleador = usuario?.nombre || 'Usuario';
    }

    this.slideIntervalId = setInterval(() => {
      this.nextSlide();
    }, 9000);

    this.checkMobile();
  }

  ngOnDestroy() {
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
    }
  }


  cargarNotificaciones() {
    this.api.obtenerNotificaciones().subscribe({
      next: (notifs) => {
        this.notifications = notifs.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: new Date(n.time).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
          read: n.read,
          applicantId: n.applicantId // <--- ¡AQUÍ ESTÁ LA CORRECCIÓN!
        }));
        this.hasUnreadNotifications = this.notifications.some(n => !n.read);
      },
      error: (err) => console.error('Error al obtener notificaciones', err)
    });
  }
  agregarNotificacion(datos: any) {
    const nuevaNotificacion: NotificationItem = {
      id: Date.now(), 
      title: datos.titulo,
      message: datos.mensaje,
      time: 'Hace un momento',
      read: false,
      applicantId: datos.id_postulante
    };

    this.notifications.unshift(nuevaNotificacion);
    this.hasUnreadNotifications = true;
    this.cdr.detectChanges(); 
  }

  onNotificationClick(notif: NotificationItem, event: Event) {
    event.stopPropagation();
    notif.read = true;
    this.notificationsOpen = false;

    if (notif.applicantId) {
      this.router.navigate(['/perfil-postulante', notif.applicantId], { 
        queryParams: { seguimiento: 'true' } 
      });
    }
    this.cdr.detectChanges(); 
  }

  // MÉTODO ACTUALIZADO: MARCAR COMO LEIDAS EN LA BASE DE DATOS
  toggleNotifications(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen = !this.notificationsOpen;

    if (this.notificationsOpen && this.hasUnreadNotifications) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);

      // Llamar a la API para marcarlas como leídas en PostgreSQL
      this.api.marcarNotificacionesLeidas().subscribe({
        error: (err) => console.error('Error al actualizar estado de notificaciones', err)
      });
    }
    this.menuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.notificationsOpen) {
      this.notificationsOpen = false;
    }
  }

  toggleTools() {
    this.toolsOpen = !this.toolsOpen;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

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
    this.menuOpen = false;
    this.toolsOpen = false;
    console.log('Cerrando sesión...');
  }

  crearOferta() {
    this.router.navigate(['/post-job']);
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

  showMoreApplicants() {
    this.visibleCount = Math.min(this.visibleCount + 8, this.maxVisible);
  }

  private cargarAnuncios(idEmpleador: string) {
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
      error: () => {}
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
      this.allApplicants = [];
      this.recentApplicants = [];
      return;
    }

    this.api.obtenerPostulacionesEmpleador(usuario.id).subscribe({
      next: (postulaciones: any[]) => {
        if (!Array.isArray(postulaciones) || postulaciones.length === 0) {
          this.allApplicants = [];
          this.recentApplicants = [];
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
        
        if (this.allApplicants.length > 0) {
          this.recentApplicants = this.allApplicants.slice(0, 3).map((item) => ({
            ...item,
            profession: item.appliedFor,
            experience: 'Nuevo',
            timeAgo: 'Reciente'
          } as RecentApplicant));
        } else {
          this.recentApplicants = [];
        }
      },
      error: (err) => {
        console.error('Error cargando postulaciones del empleador:', err);
        this.allApplicants = [];
        this.recentApplicants = [];
      }
    });
  }

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