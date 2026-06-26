import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
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
  promedio_valoracion?: number;
  total_valoraciones?: number;
  valoracion_propia?: number;
}

interface PublicCompanyJob {
  id_anuncio: string;
  titulo: string;
  descripcion: string;
  urgencia?: string;
  estado: string;
  ciudad: string;
  calle: string;
  img?: string | null;
  salario: string | number;
  modalidad: string;
  fecha_publicacion: string | null;
  vistas: number;
  categorias: string[];
}

@Component({
  selector: 'app-company-public-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './company-public-profile.component.html',
  styleUrl: './company-public-profile.component.css'
})
export class CompanyPublicProfileComponent implements OnInit {
  perfil: PublicCompanyProfile | null = null;
  anuncios: PublicCompanyJob[] = [];
  valoraciones_recibidas: any[] = [];
  fotoPostulante = '';
  nombrePostulante = 'Usuario';
  cargando = true;
  error = '';
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = true;
  isMobile = false;
  mostrarDescripcionCompleta = false;
  modalMensaje = '';

  selectedPerfilId = '';
  ratingSeleccionado = 0;
  ratingHover = 0;
  nuevoComentario = '';
  ratingEnviando = false;
  ratingExito = '';
  ratingError = '';

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

      this.selectedPerfilId = id;

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

  reportarPerfil(form: NgForm){
      if (form.invalid) {
        return;
      }
      
  
      const reporte = {
      motivo: form.value.motivo,
      descripcion: form.value.descripcion,
      id_empleador_reportado: this.selectedPerfilId
      };
  
  
      console.log(reporte);
  
      this.api.crearReporteEmpleador(reporte).subscribe({
        next: (resp) => {
        console.log('Reporte enviado', resp);
        this.cerrarModal();
      },
      error: (err) => {
        console.error(err);
      }
      });
      
  
    }

  cargarPerfilEmpresa(id: string): void {
    this.cargando = true;
    this.error = '';

    this.api.obtenerPerfilPublicoEmpresa(id).subscribe({
      next: (response: any) => {
        this.perfil = response?.perfil || null;
        this.anuncios = response?.anuncios || [];
        this.valoraciones_recibidas = response?.valoraciones_recibidas || [];
        if (this.perfil?.valoracion_propia) {
          this.ratingSeleccionado = this.perfil.valoracion_propia;
        }
        this.cargando = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'No fue posible cargar el perfil de la empresa.';
        this.perfil = null;
        this.anuncios = [];
        this.valoraciones_recibidas = [];
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
    this.menuAbiertoId = null;
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

  setRating(puntuacion: number): void {
    this.ratingSeleccionado = puntuacion;
  }

  setHover(puntuacion: number): void {
    this.ratingHover = puntuacion;
  }

   abrirModal(){
      this.mostrarModal("¿Estás seguro de querer reportar este perfil?")        
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

  enviarCalificacion(): void {
    if (!this.perfil?.id_empleador || (this.ratingSeleccionado === 0 && !this.nuevoComentario.trim())) return;

    this.ratingEnviando = true;
    this.ratingExito = '';
    this.ratingError = '';

    this.api.calificarEmpleador(
      this.perfil.id_empleador,
      this.ratingSeleccionado || undefined as any,
      this.nuevoComentario.trim() || undefined
    ).subscribe({
      next: (res: any) => {
        this.ratingEnviando = false;
        this.ratingExito = res.message || 'Valoración guardada correctamente';
        if (this.perfil) {
          this.perfil.promedio_valoracion = res.promedio_valoracion;
          this.perfil.total_valoraciones = res.total_valoraciones;
          if (this.ratingSeleccionado > 0) {
            this.perfil.valoracion_propia = this.ratingSeleccionado;
          }
        }
        this.valoraciones_recibidas = res.valoraciones_recibidas || [];
        this.nuevoComentario = '';
        setTimeout(() => this.ratingExito = '', 4000);
      },
      error: (err) => {
        this.ratingEnviando = false;
        this.ratingError = err.error?.error || 'Error al enviar la calificación';
        setTimeout(() => this.ratingError = '', 4000);
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
        if (this.perfil?.id_empleador) {
          this.cargarPerfilEmpresa(this.perfil.id_empleador);
        }
      },
      error: (err) => {
        console.error('Error al eliminar valoración:', err);
      }
    });
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
}
