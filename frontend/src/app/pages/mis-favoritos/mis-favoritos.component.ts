import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface FavoriteJob {
  id_favoritos: string;
  fecha_guardado: string;
  id_anuncio: string;
  titulo: string;
  descripcion: string;
  urgencia?: string;
  estado: string;
  ciudad: string;
  colonia: string;
  salario: string | number;
  modalidad: string;
  estado_anuncio: string;
  vistas: number;
  nombre_empresa: string;
  descripcion_empresa?: string;
  foto_empresa?: string;
  categorias: string[];
}

@Component({
  selector: 'app-mis-favoritos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mis-favoritos.component.html',
  styleUrl: './mis-favoritos.component.css'
})
export class MisFavoritosComponent implements OnInit {
  favoritos: FavoriteJob[] = [];
  cargando = true;
  error = '';
  nombrePostulante = 'Usuario';
  fotoPerfil = '';
  menuOpen = false;
  isMobile = false;
  quitandoId: string | null = null;

  constructor(
    private readonly api: ApiService,
    private readonly authApi: AuthService,
    private readonly router: Router,
    private readonly location: Location,
    private readonly themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const usuario = this.api.getUsuario();

    if (!usuario || usuario.rol !== 'postulante') {
      this.error = 'Inicia sesion como postulante para ver tus favoritos.';
      this.cargando = false;
      return;
    }

    this.nombrePostulante = usuario.nombre || 'Usuario';
    this.checkMobile();
    this.cargarPerfil();
    this.cargarFavoritos();
  }

  cargarFavoritos(): void {
    this.cargando = true;

    this.api.obtenerFavoritos().subscribe({
      next: (favoritos) => {
        this.favoritos = favoritos || [];
        this.error = '';
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar favoritos:', err);
        this.error = err.error?.error || 'No fue posible cargar tus favoritos.';
        this.cargando = false;
      }
    });
  }

  quitarFavorito(job: FavoriteJob, event: Event): void {
    event.stopPropagation();

    if (this.quitandoId) {
      return;
    }

    this.quitandoId = job.id_anuncio;
    this.api.eliminarFavorito(job.id_anuncio).subscribe({
      next: () => {
        this.favoritos = this.favoritos.filter((item) => item.id_anuncio !== job.id_anuncio);
        this.quitandoId = null;
      },
      error: (err) => {
        console.error('Error al quitar favorito:', err);
        this.error = err.error?.error || 'No fue posible quitar la vacante de favoritos.';
        this.quitandoId = null;
      }
    });
  }

  abrirDetalle(id: string): void {
    this.router.navigate(['/job', id]);
  }

  irAlPerfil(): void {
    this.menuOpen = false;
    this.router.navigate(['/perfil-postulante']);
  }

  volver(): void {
    this.location.back();
  }

  toggleMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.menuOpen = !this.menuOpen;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  logout(): void {
    this.authApi.logout();
    this.menuOpen = false;
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

  formatearFecha(fecha: string): string {
    if (!fecha) {
      return 'Guardado recientemente';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(fecha));
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.menuOpen && !this.isMobile) {
      this.menuOpen = false;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private cargarPerfil(): void {
    this.api.getMiPerfil().subscribe({
      next: (perfil: any) => {
        this.nombrePostulante = perfil?.nombre_postulante || this.nombrePostulante;
        this.fotoPerfil = perfil?.foto_perfil || '';
      },
      error: () => {
        this.fotoPerfil = '';
      }
    });
  }

  private checkMobile(): void {
    try {
      this.isMobile = window.innerWidth <= 768;
    } catch {
      this.isMobile = false;
    }
  }
}
