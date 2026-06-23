import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

interface EmployerProfile {
  id_empleador?: string;
  nombre_empresa: string;
  correo_electronico: string;
  pais: string;
  estado: string;
  ciudad: string;
  colonia: string;
  calle: string;
  codigo_postal: string;
  telefono: string;
  rfc: string;
  descripcion: string;
  foto_perfil?: string;
  promedio_valoracion?: number;
  total_valoraciones?: number;
  valoraciones_recibidas?: any[];
}

interface EmployerAnnouncement {
  id: string;
  empresa: string;
  estado: 'Activa' | 'Borrador' | 'Oculta';
  ubicacion: string;
  fecha: string;
  candidatos: number;
  vacante: string;
  resumen: string;
  imagen: string;
}

interface ReceivedApplication {
  id: number;
  candidato: string;
  vacante: string;
  experiencia: string;
  estado: 'Nueva' | 'En revision' | 'Entrevista' | 'Descartada';
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

type ProfileSectionTab = 'anuncios' | 'postulaciones';

@Component({
  selector: 'app-employer-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './employer-profile.component.html',
  styleUrl: './employer-profile.component.css'
})
export class EmployerProfileComponent implements OnInit {
  employerId = '';
  perfil: EmployerProfile | null = null;
  cargando = true;
  error = '';
  mostrarDescripcionCompleta = false;
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = true;
  isMobile = false;
  activeTab: ProfileSectionTab = 'anuncios';
  modalMensaje = '';

  // Estos datos sirven como respaldo visual si la tabla `anuncios` aun no tiene registros.
  anuncios: EmployerAnnouncement[] = [
    {
      id: 'demo-1',
      empresa: 'AT&T S.M.A',
      estado: 'Activa',
      ubicacion: 'San Miguel de Allende',
      fecha: 'Hace 2 dias',
      candidatos: 19,
      vacante: 'Ejecutivo(a) de Ventas',
      resumen: 'Atencion a clientes y cierre de ventas en piso.',
      imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
    },
    {
      id: 'demo-2',
      empresa: 'AT&T S.M.A',
      estado: 'Activa',
      ubicacion: 'Centro',
      fecha: 'Hace 5 dias',
      candidatos: 11,
      vacante: 'Ejecutivo(a) de Ventas',
      resumen: 'Base mensual, comisiones y capacitacion continua.',
      imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
    },
    {
      id: 'demo-3',
      empresa: 'AT&T S.M.A',
      estado: 'Borrador',
      ubicacion: 'Dolores Hidalgo',
      fecha: 'Hace 1 semana',
      candidatos: 8,
      vacante: 'Ejecutivo(a) de Ventas',
      resumen: 'Seguimiento de prospectos, CRM y objetivos mensuales.',
      imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
    },
    {
      id: 'demo-4',
      empresa: 'AT&T S.M.A',
      estado: 'Oculta',
      ubicacion: 'San Luis de la Paz',
      fecha: 'Hace 2 semanas',
      candidatos: 26,
      vacante: 'Ejecutivo(a) de Ventas',
      resumen: 'Vacante cerrada por cobertura completa del perfil.',
      imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
    }
  ];

  resenas: any[] = [];

  postulacionesRecibidas: ReceivedApplication[] = [
    { id: 1, candidato: 'Fernanda Lopez', vacante: 'Ejecutivo(a) de Ventas', experiencia: '3 anos', estado: 'Nueva' },
    { id: 2, candidato: 'Rafael Diaz', vacante: 'Ejecutivo(a) de Ventas', experiencia: '2 anos', estado: 'En revision' },
    { id: 3, candidato: 'Sofia Martinez', vacante: 'Ejecutivo(a) de Ventas', experiencia: '4 anos', estado: 'Entrevista' },
    { id: 4, candidato: 'Luis Chavez', vacante: 'Ejecutivo(a) de Ventas', experiencia: '1 ano', estado: 'Descartada' }
  ];

  notifications: NotificationItem[] = [
    { id: 1, title: 'Nuevo postulante', message: 'Acabas de recibir una nueva postulacion.', time: 'Hace 8 min', read: false },
    { id: 2, title: 'Recordatorio', message: 'Completa la descripcion de empresa para destacar mas.', time: 'Hace 1 hora', read: false },
    { id: 3, title: 'Chambee', message: 'Tu perfil esta visible para candidatos.', time: 'Hace 1 dia', read: true }
  ];

  constructor(
    private api: ApiService,
    private router: Router,
    private readonly themeService: ThemeService,
    private readonly authApi: AuthService
  ) {}

  ngOnInit(): void {
    const usuario = this.api.getUsuario();
    const perfilLocalRaw = localStorage.getItem('perfilEmpleador') || sessionStorage.getItem('perfilEmpleador');;

    if (!usuario) {
      this.error = 'No hay sesion activa. Inicia sesion para ver tu perfil.';
      this.cargando = false;
      return;
    }

    if (usuario.rol !== 'empleador') {
      this.error = 'Esta seccion es solo para empleadores.';
      this.cargando = false;
      return;
    }

    if (perfilLocalRaw) {
      // Muestra datos al instante mientras se refresca contra backend.
      this.perfil = JSON.parse(perfilLocalRaw);
    }

    this.api.getMiPerfil().subscribe({
      next: (perfil: any) => {
        this.perfil = perfil;
        this.resenas = perfil.valoraciones_recibidas || [];

        if (localStorage.getItem('token')) {
          localStorage.setItem("perfilEmpleador", JSON.stringify(perfil));
        } else {
          sessionStorage.setItem("perfilEmpleador", JSON.stringify(perfil));
        }

        this.cargarAnuncios(perfil.id_empleador);

        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        if (!this.perfil) {
          this.error = "No fue posible cargar tu perfil en este momento."
        }
      }
    });

    this.checkMobile();
  };

  cargarAnuncios(idEmpleador: string) {
    this.api.obtenerAnunciosEmpleador(idEmpleador).subscribe({
      next: (anunciosDb) => {
        if (!anunciosDb.length) {
          return;
        }

        this.anuncios = anunciosDb.map((anuncio) => ({
          id: anuncio.id_anuncio,
          empresa: this.perfil?.nombre_empresa || 'Mi empresa',
          estado: this.mapAnnouncementState(anuncio.estado_anuncio),
          ubicacion: `${anuncio.ciudad}, ${anuncio.estado}`,
          fecha: this.formatearFecha(anuncio.fecha_publicacion),
          candidatos: anuncio.postulaciones_count ?? anuncio.vistas ?? 0,
          vacante: anuncio.titulo,
          resumen: anuncio.descripcion,
          imagen: anuncio.img || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
        }));
      },
      error: () => {
        // Se conserva el respaldo visual local para no vaciar la interfaz.
      }
    });
  }

  // Direccion formateada para mantener limpia la plantilla HTML.
  get direccionCompleta(): string {
    if (!this.perfil) {
      return '';
    }
    return `${this.perfil.calle}, ${this.perfil.colonia}, ${this.perfil.ciudad}, ${this.perfil.estado}, ${this.perfil.pais}`;
  }

  get descripcionVisible(): string {
    if (!this.perfil?.descripcion) {
      return '';
    }
    const limite = 100;
    if (this.mostrarDescripcionCompleta || this.perfil.descripcion.length <= limite) {
      return this.perfil.descripcion;
    }


  
    return `${this.perfil.descripcion.slice(0, limite)}...`;
  }

  toggleDescripcion() {
    this.mostrarDescripcionCompleta = !this.mostrarDescripcionCompleta;
  }

  // Cambia la seccion activa dentro de la ceja de pestañas.
  setActiveTab(tab: ProfileSectionTab) {
    this.activeTab = tab;
  }

  // Clases visuales para badges de estado.
  getAnnouncementStateClass(estado: EmployerAnnouncement['estado']): string {
    if (estado === 'Activa') return 'state-active';
    if (estado === 'Borrador') return 'state-paused';
    return 'state-closed';
  }

  getApplicationStateClass(estado: ReceivedApplication['estado']): string {
    if (estado === 'Nueva') return 'app-new';
    if (estado === 'En revision') return 'app-review';
    if (estado === 'Entrevista') return 'app-interview';
    return 'app-discarded';
  }

  getStarsArray(promedio: number): string[] {
    const stars: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (promedio >= i) {
        stars.push('full');
      } else if (promedio >= i - 0.5) {
        stars.push('half');
      } else {
        stars.push('empty');
      }
    }
    return stars;
  }

  editarPerfil() {
    this.router.navigate(['/perfil/editar']);
  }

  crearOferta() {
    this.router.navigate(['/post-job']);
  }

  administrarVacantes() {
    this.router.navigate(['/mis-vacantes']);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

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

  toggleMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  

  logout() {
    this.authApi.logout();
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.notificationsOpen) {
      this.notificationsOpen = false;
    }
    if (this.menuOpen) {
      this.menuOpen = false;
    }
    if (this.menuAbiertoId) {
      this.menuAbiertoId = null;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  private checkMobile() {
    try {
      this.isMobile = window.innerWidth <= 768;
    } catch {
      this.isMobile = false;
    }
  }

  volverPanel() {
    this.router.navigate(['/home-employer']);
  }

  private mapAnnouncementState(estado: string): EmployerAnnouncement['estado'] {
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

  
   eliminarCuenta(){
     this.api.eliminarEmpleador().subscribe({
    next: () => {
      localStorage.removeItem('token');
      this.mostrarModalAceptar("Esperamos que hayas disfrutado el tiempo que pasaste en Chambee.")
      this.router.navigate(['/login']);
    },
    error: (err) => {
      console.error(err);
      alert('Ocurrió un error');
    }
  });
  }


  abrirModalEliminar(){
    this.mostrarModalEliminar("¿Estás seguro de querer eliminar tu cuenta?")
  }

  
  
  mostrarModalAceptar(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalAceptar');
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
  cerrarModalAceptar() {
    const modal = document.getElementById('modalAceptar');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

    mostrarModalEliminar(mensaje: string) {
    const modal = document.getElementById('modalSaludo');
    this.modalMensaje = mensaje;
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModalEliminar() {
    const modal = document.getElementById('modalSaludo');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  menuAbiertoId: string | null = null;

  toggleMenuValoracion(id: string, event: Event): void {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === id ? null : id;
  }

  eliminarValoracion(idValoracion: string): void {
    this.menuAbiertoId = null;
    this.api.eliminarValoracion(idValoracion).subscribe({
      next: () => {
        this.api.getMiPerfil().subscribe({
          next: (perfil: any) => {
            this.perfil = perfil;
            this.resenas = perfil.valoraciones_recibidas || [];
          }
        });
      },
      error: (err) => {
        console.error('Error al eliminar valoración:', err);
      }
    });
  }
}
