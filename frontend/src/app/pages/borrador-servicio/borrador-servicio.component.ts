import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface ServiceDraft {
  id_servicio: string;
  title: string;
  description: string;
  categoria: string;
  presupuesto: string;
  ubicacion: string;
  estado: string;
  ciudad: string;
  colonia: string;
  calle: string;
  codigo_postal: string;
  modalidad: string;
  urgencia: string;
  es_borrador: boolean;
  autor_id: string;
  fecha_creacion: string;
}

@Component({
  selector: 'app-borrador-servicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './borrador-servicio.component.html',
  styleUrl: './borrador-servicio.component.css'
})
export class BorradorServicioComponent implements OnInit {
  borradores: ServiceDraft[] = [];
  cargando = true;
  error = '';
  nombrePostulante = 'Usuario';
  fotoPerfil = '';
  menuOpen = false;
  isMobile = false;

  // Variables para control de modales
  modalMensaje = '';
  modalConfirmacionAbierto = false;
  modalExitoAbierto = false;
  modalAlertaAbierto = false;
  servicioSeleccionado: ServiceDraft | null = null;
  eliminandoId: string | null = null;
  publicandoId: string | null = null;

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
      this.error = 'Inicia sesión como postulante para ver tus borradores.';
      this.cargando = false;
      return;
    }

    this.nombrePostulante = usuario.nombre || 'Usuario';
    this.checkMobile();
    this.cargarPerfil();
    this.cargarBorradores();
  }

  cargarBorradores(): void {
    const usuario = this.api.getUsuario();
    if (!usuario?.id) {
      this.error = 'Inicia sesión como postulante para ver tus borradores.';
      this.cargando = false;
      return;
    }

    this.cargando = true;

    this.api.obtenerMisServicios(String(usuario.id)).subscribe({
      next: (servicios) => {
        this.borradores = (servicios || []).filter((s) => s.es_borrador) || [];
        this.error = '';
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar borradores:', err);
        this.error = err.error?.error || 'No fue posible cargar tus borradores de servicios.';
        this.cargando = false;
      }
    });
  }

  // Abre el modal de confirmación antes de eliminar
  solicitarEliminarBorrador(servicio: ServiceDraft, event: Event): void {
    event.stopPropagation();
    this.servicioSeleccionado = servicio;
    this.modalConfirmacionAbierto = true;
  }

  // Ejecuta la eliminación definitiva tras confirmar en el modal
  confirmarEliminarBorrador(): void {
    if (!this.servicioSeleccionado || this.eliminandoId) {
      return;
    }

    const id = this.servicioSeleccionado.id_servicio;
    this.eliminandoId = id;
    this.modalConfirmacionAbierto = false;

    this.api.eliminarServicio(id).subscribe({
      next: () => {
        this.borradores = this.borradores.filter((item) => item.id_servicio !== id);
        this.eliminandoId = null;
        this.servicioSeleccionado = null;
        this.mostrarExito('El borrador del servicio ha sido eliminado correctamente.');
      },
      error: (err) => {
        console.error('Error al eliminar borrador:', err);
        this.eliminandoId = null;
        this.servicioSeleccionado = null;
        this.mostrarAlerta(err.error?.error || 'No fue posible eliminar el borrador del servicio.');
      }
    });
  }

  cancelarEliminarBorrador(): void {
    this.modalConfirmacionAbierto = false;
    this.servicioSeleccionado = null;
  }

  publicarBorrador(servicio: ServiceDraft, event: Event): void {
    event.stopPropagation();

    if (this.publicandoId) {
      return;
    }

    this.publicandoId = servicio.id_servicio;
    this.api.publicarServicio(servicio.id_servicio).subscribe({
      next: () => {
        this.borradores = this.borradores.filter((item) => item.id_servicio !== servicio.id_servicio);
        this.publicandoId = null;
        this.mostrarExito(`¡Servicio "${servicio.title}" publicado con éxito!`);
      },
      error: (err) => {
        console.error('Error al publicar borrador:', err);
        this.publicandoId = null;
        this.mostrarAlerta(err.error?.error || 'No fue posible publicar el servicio.');
      }
    });
  }

  mostrarExito(mensaje: string): void {
    this.modalMensaje = mensaje;
    this.modalExitoAbierto = true;
  }

  mostrarAlerta(mensaje: string): void {
    this.modalMensaje = mensaje;
    this.modalAlertaAbierto = true;
  }

  cerrarModalExito(): void {
    this.modalExitoAbierto = false;
    this.modalMensaje = '';
  }

  cerrarModalAlerta(): void {
    this.modalAlertaAbierto = false;
    this.modalMensaje = '';
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

  formatearPresupuesto(presupuesto: string): string {
    if (!presupuesto) {
      return 'Presupuesto a convenir';
    }
    return presupuesto;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) {
      return 'Creado recientemente';
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
