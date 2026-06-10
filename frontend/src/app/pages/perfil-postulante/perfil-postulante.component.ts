import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
  imports: [CommonModule, RouterModule],
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

  notifications: NotificationItem[] = [
    { id: 1, title: '¡Bienvenido!', message: 'Tu perfil está listo.', time: 'Hace 1 min', read: false }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authApi: AuthService,
    private readonly api: ApiService,
    private readonly themeService: ThemeService
  ) { }

  ngOnInit(): void {
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
          imagen: fav.foto_empresa || 'assets/LogoChambee.png'
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
            imagen: anuncio.foto_empresa || 'assets/LogoChambee.png'
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

}