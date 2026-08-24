import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
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
  valoracion_propia?: any; // Para saber si el usuario ya calificó
}

interface EmployerAnnouncement {
  id: string;
  id_anuncio?: string;
  titulo?: string;
  empresa: string;
  estado: 'Activa' | 'Borrador' | 'Oculta';
  ubicacion: string;
  fecha: string;
  fecha_publicacion?: string;
  candidatos: number;
  vacante: string;
  resumen: string;
  descripcion?: string;
  imagen: string;
  img?: string;
  images?: string[];
  salario?: string | number;
  categorias?: string[];
  urgencia?: string;
  calle?: string;
  ciudad?: string;
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
  applicantId?: string; 
}

type ProfileSectionTab = 'anuncios' | 'postulaciones';

@Component({
  selector: 'app-employer-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule], 
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
  hasUnreadNotifications = false;
  isMobile = false;
  activeTab: ProfileSectionTab = 'anuncios';
  modalMensaje = '';

  usuarioActual: any = null;
  isOwnProfile = false;
  isAdminView = false;
  isEmployerView = false;
  
  tiempoSuspensionAdmin: string = '7'; 
  modalMensajeExitoAdmin: string = ''; 

  // --- VARIABLES AGREGADAS PARA EVITAR ERRORES EN EL HTML ---
  fotoPostulante: string | null = null;
  modalMensajeErrorAdmin: string = '';
  valoraciones_recibidas: any[] = [];
  
  // Variables del sistema de calificación
  ratingSeleccionado: number = 0;
  ratingHover: number = 0;
  nuevoComentario: string = '';
  ratingEnviando: boolean = false;
  ratingExito: string = '';
  ratingError: string = '';
  // ----------------------------------------------------------

  anuncios: EmployerAnnouncement[] = [];
  resenas: any[] = [];
  postulacionesRecibidas: ReceivedApplication[] = [];
  notifications: NotificationItem[] = []; 
  menuAbiertoId: string | null = null;

  constructor(
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute, 
    private readonly themeService: ThemeService,
    private readonly authApi: AuthService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    const usuario = this.api.getUsuario();
    
    const paramKeys = this.route.snapshot.paramMap.keys;
    const perfilRouteId = paramKeys.length > 0 ? this.route.snapshot.paramMap.get(paramKeys[0])?.trim() : null;

    if (!usuario) {
      this.error = 'No hay sesión activa. Inicia sesión para ver tu perfil.';
      this.cargando = false;
      return;
    }

    this.usuarioActual = usuario;
    // Si el usuario es postulante, asignamos su foto (si existe) para el navbar
    this.fotoPostulante = usuario.foto_perfil || null;
    
    const rol = (usuario.rol || usuario.role || usuario.tipo || '').toLowerCase();
    this.isAdminView = rol === 'administrador' || rol === 'admin' || rol.includes('admin');
    this.isEmployerView = rol === 'empleador';

    if (!this.isAdminView) {
      this.cargarNotificaciones();
    }

    if (perfilRouteId) {
      this.employerId = perfilRouteId;
      this.isOwnProfile = false;
      this.cargarPerfilPorId(perfilRouteId);
      this.checkMobile();
      return;
    }

    if (!this.isEmployerView && !this.isAdminView) {
      this.error = 'Esta sección es solo para empleadores.';
      this.cargando = false;
      return;
    }

    this.isOwnProfile = true;

    const perfilLocalRaw = localStorage.getItem('perfilEmpleador') || sessionStorage.getItem('perfilEmpleador');
    if (perfilLocalRaw) {
      this.perfil = JSON.parse(perfilLocalRaw);
    }

    this.api.getMiPerfil().subscribe({
      next: (perfil: any) => {
        this.perfil = perfil;
        this.resenas = perfil.valoraciones_recibidas || [];
        this.valoraciones_recibidas = perfil.valoraciones_recibidas || []; // Sincronizado para el HTML

        if (localStorage.getItem('token')) {
          localStorage.setItem("perfilEmpleador", JSON.stringify(perfil));
        } else {
          sessionStorage.setItem("perfilEmpleador", JSON.stringify(perfil));
        }

        this.cargarAnuncios(perfil.id_empleador);
        this.cargarPostulacionesRecibidas(perfil.id_empleador);
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        if (!this.perfil) {
          this.error = "No fue posible cargar tu perfil en este momento.";
        }
      }
    });

    this.checkMobile();
  }

  cargarPerfilPorId(id: string) {
    this.api.obtenerPerfilEmpleador(id).subscribe({
      next: (perfil: any) => {
        this.perfil = perfil;
        this.resenas = perfil.valoraciones_recibidas || [];
        this.valoraciones_recibidas = perfil.valoraciones_recibidas || []; // Sincronizado para el HTML
        this.cargarAnuncios(id);
        this.cargarPostulacionesRecibidas(id);
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.error = "No fue posible cargar el perfil de esta empresa.";
      }
    });
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
          applicantId: n.applicantId 
        }));
        this.hasUnreadNotifications = this.notifications.some(n => !n.read);
      },
      error: (err) => console.error('Error al obtener notificaciones', err)
    });
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

  toggleNotifications(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen = !this.notificationsOpen;

    if (this.notificationsOpen && this.hasUnreadNotifications) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);

      this.api.marcarNotificacionesLeidas().subscribe({
        error: (err) => console.error('Error al actualizar estado de notificaciones', err)
      });
    }
    this.menuOpen = false;
  }

  cargarAnuncios(idEmpleador: string) {
    this.api.obtenerAnunciosEmpleador(idEmpleador).subscribe({
      next: (anunciosDb: any[]) => {
        if (!anunciosDb.length) return;

        // Se usa ...anuncio para conservar salario, categorias, etc que vienen de la DB
        this.anuncios = anunciosDb.map((anuncio) => ({
          ...anuncio, 
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
      error: () => {}
    });
  }

  private cargarPostulacionesRecibidas(idEmpleador: string) {
    this.api.obtenerPostulacionesEmpleador(idEmpleador).subscribe({
      next: (postulaciones: any[]) => {
        this.postulacionesRecibidas = (postulaciones || []).map((post) => ({
          id: post.id_postulacion,
          candidato: `${post.nombre_postulante || ''} ${post.apellido_paterno_postulante || ''}`.trim() || 'Candidato',
          vacante: post.vacante || post.titulo || 'Vacante',
          experiencia: post.perfil_postulante ? post.perfil_postulante.slice(0, 90) : 'Información no disponible',
          estado: post.estado_postulacion || 'Nueva'
        }));
      },
      error: (err) => {
        this.postulacionesRecibidas = [];
      }
    });
  }

  // --- GETTERS ---
  get direccionCompleta(): string {
    if (!this.perfil) return '';
    return `${this.perfil.calle}, ${this.perfil.colonia}, ${this.perfil.ciudad}, ${this.perfil.estado}, ${this.perfil.pais}`;
  }

  get direccionVisible(): string {
    return this.direccionCompleta;
  }

  get ubicacionGeneral(): string {
    if (!this.perfil) return '';
    return `${this.perfil.ciudad || ''}, ${this.perfil.estado || ''}`.replace(/^, | , $/g, '').trim();
  }

  get descripcionVisible(): string {
    if (!this.perfil?.descripcion) return '';
    const limite = 100;
    if (this.mostrarDescripcionCompleta || this.perfil.descripcion.length <= limite) {
      return this.perfil.descripcion;
    }
    return `${this.perfil.descripcion.slice(0, limite)}...`;
  }
  // --------------

  toggleDescripcion() {
    this.mostrarDescripcionCompleta = !this.mostrarDescripcionCompleta;
  }

  setActiveTab(tab: ProfileSectionTab) {
    this.activeTab = tab;
  }

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
      if (promedio >= i) stars.push('full');
      else if (promedio >= i - 0.5) stars.push('half');
      else stars.push('empty');
    }
    return stars;
  }

  // --- RUTAS Y NAVEGACIÓN ---
  editarPerfil() {
    this.router.navigate(['/perfil/editar']);
  }

  irAlPerfil() {
    this.router.navigate(['/perfil']);
  }

  crearOferta() {
    this.router.navigate(['/post-job']);
  }

  administrarVacantes() {
    this.router.navigate(['/mis-vacantes']);
  }
  
  irAFavoritos() {
    this.router.navigate(['/favoritos']); // Ajusta si la ruta en tu app es diferente
  }

  verVacante(id: string) {
    this.router.navigate(['/vacante', id]); // Ajusta según tus rutas
  }

  goBack() {
    window.history.back();
  }
  // --------------------------

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  toggleMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  logout() {
    this.authApi.logout();
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.notificationsOpen) this.notificationsOpen = false;
    if (this.menuOpen) this.menuOpen = false;
    if (this.menuAbiertoId) this.menuAbiertoId = null;
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
    if(this.isAdminView) {
      this.router.navigate(['/admin-dashboard']);
    } else if (this.isEmployerView) {
      this.router.navigate(['/home-employer']);
    } else {
      this.router.navigate(['/home-user']);
    }
  }

  private mapAnnouncementState(estado: string): EmployerAnnouncement['estado'] {
    if (estado === 'ACTIVO') return 'Activa';
    if (estado === 'BORRADOR') return 'Borrador';
    return 'Oculta';
  }

  // Hecho público quitando "private" para que el HTML acceda sin advertencias en versiones estrictas
  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return 'Recién publicada';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatearSalario(salario: any): string {
    if (!salario) return 'No especificado';
    return `$${salario}`;
  }

  // --- MÉTODOS DEL SISTEMA DE CALIFICACIONES ---
  setRating(rating: number) {
    this.ratingSeleccionado = rating;
  }

  setHover(rating: number) {
    this.ratingHover = rating;
  }

  enviarCalificacion() {
    if (this.ratingSeleccionado === 0 && !this.nuevoComentario.trim()) return;
    
    this.ratingEnviando = true;
    this.ratingError = '';
    this.ratingExito = '';

    // AQUÍ DEBERÍAS LLAMAR A TU SERVICIO API PARA GUARDAR LA RESEÑA
    /* Ejemplo:
    this.api.enviarValoracion(this.perfil.id_empleador, this.ratingSeleccionado, this.nuevoComentario).subscribe({
      next: () => { ... },
      error: () => { ... }
    });
    */

    // Simulador para que la UI funcione por ahora:
    setTimeout(() => {
      this.ratingEnviando = false;
      this.ratingExito = '¡Calificación enviada correctamente!';
      // Opcional: limpiar los campos tras enviarlo
      // this.ratingSeleccionado = 0;
      // this.nuevoComentario = '';
    }, 1500);
  }
  // ---------------------------------------------

  // --- MODALES Y ACCIONES GENERALES ---
  abrirModal() {
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

  reportarPerfil(form: any) {
    if (form.invalid) return;
    
    // Lógica para enviar el reporte a la base de datos
    console.log('Reportando perfil con motivos:', form.value);
    
    this.cerrarModal();
    // Podrías mostrar un SweetAlert o un mensaje de éxito aquí
  }

  eliminarCuenta(){
    this.api.eliminarEmpleador().subscribe({
      next: () => {
        localStorage.removeItem('token');
        this.mostrarModalAceptar("Esperamos que hayas disfrutado el tiempo que pasaste en Chambee.")
        this.router.navigate(['/login']);
      },
      error: (err) => {
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

  toggleMenuValoracion(id: string, event: Event): void {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === id ? null : id;
  }

  eliminarValoracion(idValoracion: string): void {
    this.menuAbiertoId = null;
    this.api.eliminarValoracion(idValoracion).subscribe({
      next: () => {
        if(this.employerId) {
           this.cargarPerfilPorId(this.employerId);
        } else {
           this.api.getMiPerfil().subscribe({
             next: (perfil: any) => {
               this.perfil = perfil;
               this.resenas = perfil.valoraciones_recibidas || [];
               this.valoraciones_recibidas = perfil.valoraciones_recibidas || [];
             }
           });
        }
      }
    });
  }

  // ==========================================
  // FUNCIONES DE ADMIN: ELIMINAR Y SUSPENDER
  // ==========================================
  abrirModalEliminarAdmin() {
    const modal = document.getElementById('modalEliminarAdmin');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModalEliminarAdmin() {
    const modal = document.getElementById('modalEliminarAdmin');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  ejecutarEliminarAdmin() {
    const id = this.perfil?.id_empleador || this.employerId;
    
    if (!id) {
      alert("No se pudo obtener el ID de la empresa.");
      return;
    }

    this.api.eliminarUsuario(id).subscribe({
      next: () => {
        this.cerrarModalEliminarAdmin();
        this.mostrarModalExitoAdmin("El perfil de la empresa ha sido borrado permanentemente.");
      },
      error: (err) => {
        this.cerrarModalEliminarAdmin();
        this.modalMensajeErrorAdmin = 'Hubo un problema al intentar borrar este perfil desde la base de datos.';
        const modal = document.getElementById('modalErrorAdmin');
        if (modal) {
          modal.classList.add('show');
          modal.style.display = 'flex';
        }
      }
    });
  }

  abrirModalSuspenderAdmin() {
    const modal = document.getElementById('modalSuspenderAdmin');
    this.tiempoSuspensionAdmin = '7'; 
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModalSuspenderAdmin() {
    const modal = document.getElementById('modalSuspenderAdmin');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  ejecutarSuspensionAdmin() {
    const id = this.perfil?.id_empleador || this.employerId;
    if (!id) return;

    const dias = parseInt(this.tiempoSuspensionAdmin, 10);

    this.api.suspenderUsuario(id, dias).subscribe({
      next: () => {
        this.cerrarModalSuspenderAdmin();
        this.mostrarModalExitoAdmin(dias === 0 ? "La empresa ha sido suspendida permanentemente." : `La empresa ha sido suspendida por ${dias} días.`);
      },
      error: (err) => {
        this.cerrarModalSuspenderAdmin();
        this.modalMensajeErrorAdmin = 'Hubo un problema al suspender la empresa.';
        const modal = document.getElementById('modalErrorAdmin');
        if (modal) {
          modal.classList.add('show');
          modal.style.display = 'flex';
        }
      }
    });
  }

  mostrarModalExitoAdmin(mensaje: string) {
    this.modalMensajeExitoAdmin = mensaje;
    const modal = document.getElementById('modalExitoAdmin');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';

      setTimeout(() => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        this.router.navigate(['/admin-dashboard']);
      }, 2500);
    }
  }

  cerrarModalErrorAdmin() {
    const modal = document.getElementById('modalErrorAdmin');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }
}