import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface PublicCompanyProfile {
  id_empleador: string;
  nombre_empresa: string;
  estado: string;
  ciudad: string;
  calle: string;
  descripcion: string;
  foto_perfil?: string;
  vacantes_activas: number;
}

interface PublicCompanyJob {
  id_anuncio: string;
  titulo: string;
  descripcion: string;
  urgencia?: string;
  estado: string;
  ciudad: string;
  calle: string;
  salario: string | number;
  modalidad: string;
  fecha_publicacion: string | null;
  vistas: number;
  categorias: string[];
}

@Component({
  selector: 'app-company-public-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './company-public-profile.component.html',
  styleUrl: './company-public-profile.component.css'
})
export class CompanyPublicProfileComponent implements OnInit {
  perfil: PublicCompanyProfile | null = null;
  anuncios: PublicCompanyJob[] = [];
  fotoPostulante = '';
  nombrePostulante = 'Usuario';
  cargando = true;
  error = '';
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = true;
  isMobile = false;
  mostrarDescripcionCompleta = false;

  notifications = [
    { id: 1, title: 'Vacantes activas', message: 'Revisa el perfil de la empresa antes de postularte.', time: 'Ahora', read: false },
    { id: 2, title: 'Chambee', message: 'Tu sesion sigue en modo postulante.', time: 'Hace 1 min', read: true }
  ];

  constructor(
    private readonly api: ApiService,
    private readonly authApi: AuthService,
    private readonly location: Location,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.checkMobile();
    this.cargarPostulante();

    const usuario = this.api.getUsuario();
    if (!usuario) {
      this.router.navigate(['/login']);
      return;
    }

    if (usuario.rol !== 'postulante') {
      this.error = 'Esta vista esta disponible solo para postulantes.';
      this.cargando = false;
      return;
    }

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error = 'No se encontro la empresa solicitada.';
        this.cargando = false;
        return;
      }

      this.cargarPerfilEmpresa(id);
    });
  }

  get descripcionVisible(): string {
    const descripcion = this.perfil?.descripcion || 'Empresa activa en Chambee.';
    const limite = 220;

    if (this.mostrarDescripcionCompleta || descripcion.length <= limite) {
      return descripcion;
    }

    return `${descripcion.slice(0, limite)}...`;
  }

  get ubicacionGeneral(): string {
    return [this.direccionVisible, this.perfil?.ciudad, this.perfil?.estado].filter(Boolean).join(', ');
  }

  get direccionVisible(): string {
    const callePerfil = this.perfil?.calle?.trim();
    if (callePerfil) {
      return callePerfil;
    }

    const anuncioConCalle = this.anuncios.find((anuncio) => anuncio.calle?.trim());
    return anuncioConCalle?.calle?.trim() || '';
  }

  cargarPerfilEmpresa(id: string): void {
    this.cargando = true;
    this.error = '';

    this.api.obtenerPerfilPublicoEmpresa(id).subscribe({
      next: (response: any) => {
        this.perfil = response?.perfil || null;
        this.anuncios = response?.anuncios || [];
        this.cargando = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'No fue posible cargar el perfil de la empresa.';
        this.perfil = null;
        this.anuncios = [];
        this.cargando = false;
      }
    });
  }

  cargarPostulante(): void {
    const usuario = this.api.getUsuario();
    if (!usuario?.id || usuario.rol !== 'postulante') {
      return;
    }

    this.api.getMiPerfil().subscribe({
      next: (perfil: any) => {
        this.nombrePostulante = perfil?.nombre_postulante || usuario?.nombre || 'Usuario';
        this.fotoPostulante = perfil?.foto_perfil || '';
      },
      error: () => {
        this.nombrePostulante = usuario?.nombre || 'Usuario';
      }
    });
  }

  formatearSalario(salario: string | number): string {
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

  formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return 'Recien publicada';
    }

    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  toggleDescripcion(): void {
    this.mostrarDescripcionCompleta = !this.mostrarDescripcionCompleta;
  }

  verVacante(id: string): void {
    this.router.navigate(['/job', id]);
  }

  irAlPerfil(): void {
    this.menuOpen = false;
    this.router.navigate(['/perfil-postulante']);
  }

  irAFavoritos(): void {
    this.menuOpen = false;
    this.router.navigate(['/mis-favoritos']);
  }

  goBack(): void {
    this.location.back();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  toggleNotifications(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen = !this.notificationsOpen;
    this.menuOpen = false;

    if (this.notificationsOpen) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach((notification) => notification.read = true);
    }
  }

  toggleMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  logout(): void {
    this.authApi.logout();
    this.menuOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.notificationsOpen = false;
    this.menuOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    try {
      this.isMobile = window.innerWidth <= 768;
    } catch {
      this.isMobile = false;
    }
  }
}
