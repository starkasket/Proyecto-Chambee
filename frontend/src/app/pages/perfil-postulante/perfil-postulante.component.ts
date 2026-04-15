import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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

type ProfileSectionTab = 'postulaciones' | 'favoritos' | 'recomendados';

@Component({
  selector: 'app-perfil-postulante',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './perfil-postulante.component.html',
  styleUrls: ['./perfil-postulante.component.css']
})
export class PerfilPostulanteComponent implements OnInit {
  perfil: PostulanteProfile | null = null;
  cargando = true;
  error = '';
  subiendoCv = false;
  cvMensaje = '';
  cvError = false;

  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = true;
  isMobile = false;
  activeTab: ProfileSectionTab = 'postulaciones';

  postulaciones: PostulanteApplication[] = [];
  favoritos: PostulanteFavorites[] = [];
  recomendados: PostulanteFavorites[] = [];

  notifications: NotificationItem[] = [
    { id: 1, title: '¡Bienvenido!', message: 'Tu perfil está listo.', time: 'Hace 1 min', read: false }
  ];

  constructor(
    private router: Router,
    private authApi: AuthService,
    private readonly api: ApiService,
    private readonly themeService: ThemeService
  ) { }

  ngOnInit(): void {
    const usuario = this.api.getUsuario();
    const perfilLocalRaw = localStorage.getItem('perfilPostulante') || sessionStorage.getItem('perfilPostulante');

    if (!usuario || usuario.rol !== 'postulante') {
      this.error = 'No tienes permiso para estar aquí.';
      this.cargando = false;
      return;
    }

    if (perfilLocalRaw) {
      this.perfil = JSON.parse(perfilLocalRaw);
    }

    this.api.getMiPerfil().subscribe({
      next: (perfilDb: any) => {
        this.perfil = perfilDb;
        this.error = '';
        this.actualizarCache(perfilDb);
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 401) {
          this.error = "Sesión expirada.";
        } else if (!this.perfil) {
          this.error = "Error al conectar con el servidor.";
        }
        console.error("Error al obtener perfil:", err);
      }
    });

    this.checkMobile();
  }

  private actualizarCache(datos: any) {
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem("perfilPostulante", JSON.stringify(datos));
  }

  get direccionCompleta(): string {
    if (!this.perfil) return '';
    return `${this.perfil.calle || ''}, ${this.perfil.colonia || ''}, ${this.perfil.ciudad || ''}, ${this.perfil.estado || ''}, ${this.perfil.pais || ''}`.replace(/^, | ,|, $/g, '').trim();
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

    if (file.size > 5 * 1024 * 1024) {
      this.cvError = true;
      this.cvMensaje = 'El archivo supera los 5 MB.';
      return;
    }

    this.subiendoCv = true;
    this.cvMensaje = '';
    this.cvError = false;

    try {
      const dataForCloudinary = new FormData();
      dataForCloudinary.append('file', file);
      dataForCloudinary.append('upload_preset', 'Chambee-cv');

      // Usamos /raw/ para PDFs para evitar errores 401 de acceso
      const cloudUrl = `https://api.cloudinary.com/v1_1/dqq9oeo4e/raw/upload`;
      const cloudRes = await fetch(cloudUrl, { method: 'POST', body: dataForCloudinary });

      if (!cloudRes.ok) throw new Error('Error al subir a la nube.');

      const cloudData = await cloudRes.json();
      const pdfUrl = cloudData.secure_url;

      this.api.actualizarMiPerfil({ archivo_cv: pdfUrl }).subscribe({
        next: () => {
          if (this.perfil) {
            this.perfil.archivo_cv = pdfUrl;
            this.actualizarCache(this.perfil);
          }
          this.cvMensaje = 'C.V. actualizado correctamente.';
          this.cvError = false;
          this.subiendoCv = false;
        },
        error: (err) => {
          console.error(err);
          this.cvError = true;
          this.cvMensaje = 'Error al guardar en base de datos.';
          this.subiendoCv = false;
        }
      });

    } catch (err: any) {
      this.cvError = true;
      this.cvMensaje = err.message || 'Error en la subida.';
      this.subiendoCv = false;
    }
  }

  // --- Métodos de Interfaz ---
  setActiveTab(tabName: ProfileSectionTab) { this.activeTab = tabName; }
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
  @HostListener('document:click') onDocumentClick() {
    this.notificationsOpen = false;
    if (!this.isMobile) this.menuOpen = false;
  }
  @HostListener('window:resize') onResize() { this.checkMobile(); }
  private checkMobile() { this.isMobile = window.innerWidth <= 768; }
  toggleTheme() { this.themeService.toggleTheme(); }
  get isDarkMode(): boolean { return this.themeService.isDarkMode(); }
  volverPanel() { this.router.navigate(['/inicio-postulante']); }
  editarPerfil() { this.router.navigate(['/perfil-postulante/editar']); }
  buscarEmpleos() { this.router.navigate(['/buscar-empleos']); }
  logout() { this.authApi.logout(); }
}