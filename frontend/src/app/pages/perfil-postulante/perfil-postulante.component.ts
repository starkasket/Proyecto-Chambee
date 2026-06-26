import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface PostulanteProfile {
  id_postulante?: string;
  nombre_postulante: string;
  apellido_paterno_postulante: string;
  apellido_materno_postulante: string;
  correo_electronico: string;
  fecha_nacimiento: string;
  sexo: string;
  pais: string;
  estado: string;
  ciudad: string;
  colonia: string;
  calle: string;
  codigo_postal: string;
  telefono: string;
  fecha_registro: string;
  estado_cuenta: string;
  curp: string;
  rfc: string;
  foto_perfil?: string;
  archivo_cv?: string;
  descripcion?: string;
  promedio_valoracion?: number;
  total_valoraciones?: number;
  valoracion_propia?: number | null;
  valoraciones_recibidas?: any[];
}

interface PostulanteApplication {
  id: string;
  empresa: string;
  estado: 'Nueva' | 'En revision' | 'Entrevista' | 'Descartada';
  ubicacion: string;
  fecha: string;
  candidatos: number;
  vacante: string;
  resumen: string;
  imagen: string;
}

interface PostulanteFavorites {
  id: string;
  empresa: string;
  estado: 'Activa' | 'Pausada' | 'Cerrada';
  ubicacion: string;
  fecha: string;
  candidatos: number;
  vacante: string;
  resumen: string;
  imagen: string;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

type ProfileSectionTab = 'postulaciones' | 'favoritos' | 'historial';

@Component({
  selector: 'app-perfil-postulante',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './perfil-postulante.component.html',
  styleUrls: ['./perfil-postulante.component.css']
})
export class PerfilPostulanteComponent implements OnInit {
  postulanteId = '';
  perfil: PostulanteProfile | null = null;
  cargando = true;
  error = '';
  subiendoCv = false;
  cvMensaje = '';
  cvError = false;
  cvPublico = true;
  
  modalMensaje = '';
  

  

// VARIABLE PARA LAS ETIQUETAS
  misEtiquetas: string[] = [];

  private readonly CLOUDINARY_CLOUD_NAME = 'dqq9oeo4e';
  private readonly CLOUDINARY_UPLOAD_PRESET = 'Chambee-cv';

  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = true;
  isMobile = false;
  activeTab: ProfileSectionTab = 'postulaciones';
  isEmployerView = false;
  selectedPerfilId = '';
  usuarioActual: any = null;

  postulaciones: PostulanteApplication[] = [];
  favoritos: PostulanteFavorites[] = [];
  vistosRecientemente: PostulanteFavorites[] = [];

  // Variables para valoración
  ratingEnviando = false;
  ratingExito = '';
  ratingError = '';
  nuevoComentario = '';
  ratingSeleccionado = 0;
  ratingHover = 0;

  notifications: NotificationItem[] = [
    { id: 1, title: '¡Bienvenido!', message: 'Tu perfil está listo.', time: 'Hace 1 min', read: false }
  ];
mostrarBannerSeguimiento: boolean = false
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authApi: AuthService,
    private readonly api: ApiService,
    private readonly themeService: ThemeService
    
  ) { }

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {
      if (params['seguimiento'] === 'true') {
        this.mostrarBannerSeguimiento = true;
      }
      
    });
    const usuario = this.api.getUsuario();
    const perfilRouteId = this.route.snapshot.paramMap.get('id')?.trim();

    if (!usuario) {
      this.error = 'No hay sesión activa. Inicia sesión para ver tu perfil.';
      this.cargando = false;
      return;
    }

    this.usuarioActual = usuario;

    if (perfilRouteId) {
      this.selectedPerfilId = perfilRouteId;
      this.isEmployerView = usuario.rol === 'empleador';
 
      if (usuario.rol === 'postulante' && usuario.id !== perfilRouteId) {
        this.error = 'No estás autorizado para ver este perfil.';
        this.cargando = false;
        return;
      }

      this.loadPerfilById(perfilRouteId);
      this.checkMobile();
      return;
    }

    if (usuario.rol !== 'postulante') {
      this.error = 'Esta sección es solo para postulantes.';
      this.cargando = false;
      return;
    }

    const perfilLocalRaw = localStorage.getItem('perfilPostulante') || sessionStorage.getItem('perfilPostulante');
    if (perfilLocalRaw) {
      this.perfil = JSON.parse(perfilLocalRaw);
    }

    this.api.getMiPerfil().subscribe({
      next: (perfilDb: any) => {
        this.perfil = perfilDb;
        this.cvPublico = perfilDb.visible_empresas ?? true; 

        this.error = '';

        if (localStorage.getItem('token')) {
          localStorage.setItem("perfilPostulante", JSON.stringify(perfilDb));
        } else {
          sessionStorage.setItem("perfilPostulante", JSON.stringify(perfilDb));
        }

        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;

        if (err.status === 401) {
          this.error = "Tu sesión ha expirado o no tienes autorización. Por favor, vuelve a iniciar sesión.";
        } else {
          if (!this.perfil) {
            this.error = "No fue posible cargar tu perfil en este momento. Revisa tu conexión al servidor.";
          }
        }
        console.error("Error al obtener perfil:", err);
      }
    });

    this.api.obtenerMisEtiquetas().subscribe({
      next: (response: any) => {
        this.misEtiquetas = Array.isArray(response?.etiquetas) ? response.etiquetas : [];
      },
      error: (err) => {
        console.error('No se pudieron obtener las etiquetas', err);
        this.misEtiquetas = [];
      }
    });

    this.cargarFavoritos();
    this.cargarHistorial();
    this.checkMobile();

    
  }

  aceptarSeguimiento() {
    this.mostrarBannerSeguimiento = false; // Ocultamos el banner
    
    // Extraemos el ID del postulante desde la URL
    const idPostulante = this.route.snapshot.paramMap.get('id');

    if (idPostulante) {
      // Llamamos a la API
      this.api.aceptarPostulante(idPostulante).subscribe({
        next: (res) => {
          console.log('¡Postulante notificado con éxito!');
          // Opcional: Aquí podrías mostrar un Toast o Alert de éxito
        },
        error: (err) => {
          console.error('Hubo un error al aceptar', err);
        }
      });
    }
  }

  rechazarSeguimiento() {
    this.mostrarBannerSeguimiento = false;
    // Aquí puedes llamar a tu API para rechazarlo
    console.log('Postulante Rechazado');
  }
  get direccionCompleta(): string {
    if (!this.perfil) return '';
    return `${this.perfil.calle || ''}, ${this.perfil.colonia || ''}, ${this.perfil.ciudad || ''}, ${this.perfil.estado || ''}, ${this.perfil.pais || ''}`.replace(/^, | ,|, $/g, '').trim();
  }

  get navbarWelcomeName(): string {
    if (this.isEmployerView) {
      return this.usuarioActual?.nombre || 'Empresa';
    }
    return this.perfil?.nombre_postulante || 'Usuario';
  }

  setActiveTab(tabName: ProfileSectionTab) {
    this.activeTab = tabName;
  }

  getApplicationStateClass(estado: PostulanteApplication['estado']): string {
    if (estado === 'Nueva') return 'app-new';
    if (estado === 'En revision') return 'app-review';
    if (estado === 'Entrevista') return 'app-interview';
    return 'app-discarded';
  }

  getJobStateClass(estado: PostulanteFavorites['estado']): string {
    if (estado === 'Activa') return 'state-active';
    if (estado === 'Pausada') return 'state-paused';
    return 'state-closed';
  }

  toggleNotifications(event?: Event) {
    if (event) event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;

    if (this.notificationsOpen) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);
    }
    this.menuOpen = false;
  }

  toggleMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.notificationsOpen) this.notificationsOpen = false;
    if (this.menuOpen && !this.isMobile) this.menuOpen = false;
    this.menuAbiertoId = null;
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

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  mostrarModal(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalAlerta');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
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

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  volverPanel() {
    if (this.isEmployerView) {
      this.router.navigate(['/home-employer']);
      return;
    }
    this.router.navigate(['/home-user']);
  }

  editarPerfil() {
    if (this.isEmployerView) {
      return;
    }
    this.router.navigate(['/perfil-postulante/editar']);
  }

  reportarPerfil(form: NgForm){
    if (form.invalid) {
      return;
    }

    console.log(this.postulanteId);
    const reporte = {
    motivo: form.value.motivo,
    descripcion: form.value.descripcion,
    id_postulante_reportado: this.selectedPerfilId
    };


    console.log(reporte);

    this.api.crearReporte(reporte).subscribe({
      next: (resp) => {
      console.log('Reporte enviado', resp);
      this.cerrarModal();
    },
    error: (err) => {
      console.error(err);
    }
    });
    

  }

  eliminarCuenta(){
     this.api.eliminarPostulante().subscribe({
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

  abrirModal(){
      this.mostrarModal("¿Estás seguro de querer reportar este perfil?")        
  }
  abrirModalEliminar(){
    this.mostrarModalEliminar("¿Estás seguro de querer eliminar tu cuenta?")
  }

  buscarEmpleos() {
    this.router.navigate(['/home-user']);
  }

  verVacante(id: string) {
    this.router.navigate(['/job', id]);
  }

  private loadPerfilById(id: string) {
    this.api.obtenerPerfilPostulante(id).subscribe({
      next: (perfilDb: any) => {
        this.perfil = perfilDb;
        if (perfilDb && perfilDb.valoracion_propia) {
          this.ratingSeleccionado = perfilDb.valoracion_propia;
        }

        this.error = '';
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 401 || err.status === 403) {
          this.error = 'No estás autorizado para ver este perfil.';
          return;
        }
        if (err.status === 404) {
          this.error = 'No se encontró el perfil del postulante.';
          return;
        }
        this.error = 'No fue posible cargar el perfil en este momento.';
        console.error('Error al obtener perfil del postulante:', err);
      }
    });
  }
  

  private cargarFavoritos() {
    this.api.obtenerFavoritos().subscribe({
      next: (favoritos: any[]) => {
        this.favoritos = (favoritos || []).map((fav) => ({
          id: fav.id_anuncio,
          empresa: fav.nombre_empresa || 'Empresa Confidencial',
          estado: fav.estado_anuncio === 'ACTIVO' ? 'Activa' as const : 'Pausada' as const,
          ubicacion: [fav.ciudad, fav.estado].filter(Boolean).join(', '),
          fecha: fav.fecha_guardado ? new Date(fav.fecha_guardado).toLocaleDateString('es-MX') : 'Reciente',
          candidatos: fav.vistas || 0,
          vacante: fav.titulo || 'Vacante',
          resumen: fav.descripcion || 'Consulta los detalles de esta vacante.',
          imagen: fav.img || fav.foto_empresa || 'assets/LogoChambee.png'
        }));
      },
      error: (err) => {
        console.error('No se pudieron obtener favoritos', err);
        this.favoritos = [];
      }
    });
  }

  private cargarHistorial() {
    const stored = localStorage.getItem('chambee_vistos_recientemente');
    if (!stored) {
      this.vistosRecientemente = [];
      return;
    }
    
    try {
      const ids = JSON.parse(stored) as string[];
      if (ids.length === 0) return;

      this.api.obtenerAnunciosPublicos().subscribe({
        next: (anuncios: any[]) => {
          if (!anuncios) return;
          
          const historyJobs = ids.map(id => anuncios.find(a => String(a.id_anuncio) === String(id)))
                                 .filter(a => a !== undefined);

          this.vistosRecientemente = historyJobs.map(anuncio => ({
            id: anuncio.id_anuncio,
            empresa: anuncio.nombre_empresa || 'Empresa Confidencial',
            estado: 'Activa',
            ubicacion: `${anuncio.ciudad || ''}, ${anuncio.estado || ''}`.replace(/^, | ,|, $/g, '').trim(),
            fecha: anuncio.fecha_publicacion ? new Date(anuncio.fecha_publicacion).toLocaleDateString('es-MX') : 'Reciente',
            candidatos: anuncio.vistas || 0,
            vacante: anuncio.titulo,
            resumen: anuncio.descripcion,
            imagen: anuncio.img || anuncio.foto_empresa || 'assets/LogoChambee.png'
          }));
        },
        error: () => {
          this.vistosRecientemente = [];
        }
      });
    } catch (e) {
      console.error("Error leyendo historial", e);
      this.vistosRecientemente = [];
    }
  }

  logout() {
    this.authApi.logout();
    this.menuOpen = false;
  } 
  
  async onCvSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.cvError = true;
      this.cvMensaje = 'Solo se permiten archivos PDF.';
      return;
    }

    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      this.cvError = true;
      this.cvMensaje = `El archivo supera el límite de ${MAX_SIZE_MB} MB.`;
      return;
    }

    this.subiendoCv = true;
    this.cvMensaje = '';
    this.cvError = false;

    try {
      // 1. Subir a Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'Chambee-cv');

      const cloudUrl = `https://api.cloudinary.com/v1_1/dqq9oeo4e/raw/upload`;
      const cloudRes = await fetch(cloudUrl, { method: 'POST', body: formData });

      if (!cloudRes.ok) {
        const errorData = await cloudRes.json();
        throw new Error(errorData.error?.message || 'Error al subir el archivo a Cloudinary.');
      }

      const cloudData = await cloudRes.json();
      const pdfUrl: string = cloudData.secure_url;

      // 2. Guardar la URL en la base de datos
      this.api.actualizarMiPerfil({ archivo_cv: pdfUrl }).subscribe({
        next: () => {
          if (this.perfil) this.perfil.archivo_cv = pdfUrl;
          this.cvMensaje = 'C.V. actualizado correctamente.';
          this.cvError = false;
        },
        error: (err: any) => {
          console.error('Error al guardar URL en BD:', err);
          this.cvError = true;
          this.cvMensaje = 'Error al vincular el CV con tu perfil.';
        }
      });

    } catch (err: any) {
      console.error('Error en subida de CV:', err);
      this.cvError = true;
      this.cvMensaje = err.message || 'Error al subir el CV.';
    } finally {
      this.subiendoCv = false;
    }
  }

  toggleCvVisibilidad(): void {
    const nuevoEstado = !this.cvPublico;
this.api.toggleVisibilidadCv(nuevoEstado).subscribe({
        next: () => {
        this.cvPublico = nuevoEstado;
        this.cvMensaje = `Tu C.V. ahora es ${nuevoEstado ? 'público' : 'privado'}.`;
        this.cvError = false;
      },
      error: (err: any) => {
        console.error('Error al cambiar visibilidad:', err);
      this.cvError = true;
      this.cvMensaje = 'No se pudo cambiar la visibilidad del C.V.';
      }
    })

  }

  setRating(puntuacion: number): void {
    this.ratingSeleccionado = puntuacion;
  }

  setHover(puntuacion: number): void {
    this.ratingHover = puntuacion;
  }

  getStarsArray(promedio: number = 0): string[] {
    const stars: string[] = [];
    const roundPromedio = Math.round(promedio * 2) / 2;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= roundPromedio) {
        stars.push('full');
      } else if (i - 0.5 === roundPromedio) {
        stars.push('half');
      } else {
        stars.push('empty');
      }
    }
    return stars;
  }

  enviarCalificacion(): void {
    if (!this.ratingSeleccionado) {
      this.ratingError = 'Por favor, selecciona una calificación (estrellas) antes de enviar.';
      return;
    }

    this.ratingEnviando = true;
    this.ratingExito = '';
    this.ratingError = '';

    this.api.calificarPostulante(this.selectedPerfilId, this.ratingSeleccionado, this.nuevoComentario).subscribe({
      next: (res: any) => {
        this.ratingEnviando = false;
        this.ratingExito = '¡Calificación registrada con éxito!';
        
        if (this.perfil) {
          this.perfil.promedio_valoracion = res.promedio_valoracion;
          this.perfil.total_valoraciones = res.total_valoraciones;
          this.perfil.valoracion_propia = this.ratingSeleccionado;
          this.perfil.valoraciones_recibidas = res.valoraciones_recibidas;
        }
        this.nuevoComentario = '';
      },
      error: (err: any) => {
        this.ratingEnviando = false;
        this.ratingError = err.error?.error || 'Error al enviar la calificación.';
        console.error('Error al calificar postulante:', err);
      }
    });
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
        if (this.selectedPerfilId) {
          this.loadPerfilById(this.selectedPerfilId);
        } else {
          this.ngOnInit();
        }
      },
      error: (err) => {
        console.error('Error al eliminar valoración:', err);
      }
    });
  }

}
