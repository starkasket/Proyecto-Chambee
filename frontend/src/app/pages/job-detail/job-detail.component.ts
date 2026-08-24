import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

import { CarouselComponent } from '../../components/carousel/carousel.component';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { GoogleMapsService } from '../../services/google-maps.service';
import { MapaUbicacionComponent } from '../../components/mapa-ubicacion/mapa-ubicacion.component';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  applicantId?: string;
}

interface Slide {
  id?: string | number;
  company: string;
  companyDescription: string;
  title: string;
  salary: string;
  location: string;
  mode: string;
  urgency?: string;
  description: string;
  img: string;
  images?: string[];
  tags: string[];
  matchScore: number;
}

interface Job {
  id?: string | number;
  company: string;
  title: string;
  salary: string;
  img: string;
  images?: string[];
  urgency?: string;
  rating: string;
  applicants: number;
  tags: string[];
  matchScore: number;
}

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CarouselComponent, MapaUbicacionComponent],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.css'
})
export class JobDetailComponent implements OnInit {
  nombre_postulante = 'Usuario';
  foto_perfil = '';
  jobId: string | null = null;
  jobData: any = null;
  relatedJobs: any[] = [];
  mostrarMapa = false;
  esFavorito = false;
  guardandoFavorito = false;
  yaPostulado = false;
  isAdminView = false;
  isMobile = false;
  servicesOpen = false;

  // SEARCH BAR
  searchTerm = '';
  searchSubject = new Subject<string>();
  searchResults: any[] = [];
  showSearchDropdown = false;
  recentSearches: string[] = [];

  // NOTIFICACIONES Y MENÚ
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = false;
  notifications: NotificationItem[] = [];
  estaLogueado = false;

  // VARIABLES PARA COMENTARIOS
  usuarioActual: any = null;
  comentarios: any[] = [];
  nuevoComentario: string = '';
  enviandoComentario = false;
  dropdownOpenIndex: number | null = null;

  // VARIABLES PARA REPORTE DE ANUNCIO
  opcionesReporte: string[] = [
    'Oferta de trabajo falsa o fraudulenta',
    'Contenido ofensivo o discriminatorio',
    'Solicitan dinero para postularse',
    'Spam, publicidad engañosa o multinivel',
    'La vacante ya no está disponible',
    'Otro (especificar abajo)'
  ];
  motivoReporte: string = '';
  detalleReporte: string = '';
  enviandoReporte: boolean = false;

  // MODAL DE GALERÍA DE IMÁGENES DEL ANUNCIO
  modalGaleriaAbierto: boolean = false;
  modalGaleriaImagenes: string[] = [];
  modalGaleriaIndex: number = 0;

  // SERVICES
  servicioDetalle: any = null;
  servicioDetalleOpen = false;
  servicioDetalleCargando = false;

  slides: Slide[] = [];
  jobs: Job[] = [];
  services: any[] = [];
  vistosRecientemente: Job[] = [];

  private map: L.Map | null = null;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly themeService = inject(ThemeService);
  private readonly api = inject(ApiService);
  private readonly authApi = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(private googleMaps: GoogleMapsService) {}

  ngOnInit(): void {
    this.usuarioActual = this.api.getUsuario();
    this.isAdminView = this.usuarioActual?.rol === 'administrador';
    this.estaLogueado = !!this.usuarioActual;
    console.log(this.isAdminView);

    if (this.usuarioActual) {
      this.cargarNotificaciones();
    }

    this.route.paramMap.subscribe((params) => {
      this.jobId = params.get('id');
      this.mostrarMapa = false;
      this.esFavorito = false;
      this.yaPostulado = false;
      this.cargarDetalles(this.jobId);
      this.cargarComentarios(this.jobId);
      this.verificarEstadoPostulacion(this.jobId);
    });

    this.cargarBusquedasRecientes();

    this.api.obtenerServiciosPublicos().subscribe({
      next: (servicios) => {
        this.services = servicios || [];
      },
      error: () => {
        this.services = [];
      }
    });

    this.cargarFotoPerfil();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.ejecutarBusqueda(query);
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

  toggleNotifications(event?: Event) {
    if (event) event.stopPropagation();
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

  toggleMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.notificationsOpen) this.notificationsOpen = false;
    if (this.menuOpen) this.menuOpen = false;
    if (this.dropdownOpenIndex !== null) this.dropdownOpenIndex = null;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.modalGaleriaAbierto) return;
    if (event.key === 'Escape') {
      this.cerrarModalGaleria();
    } else if (event.key === 'ArrowLeft') {
      this.anteriorImagenGaleria();
    } else if (event.key === 'ArrowRight') {
      this.siguienteImagenGaleria();
    }
  }

  abrirModalGaleria(imagenes?: string[], index: number = 0): void {
    const rawImages = (imagenes && imagenes.length ? imagenes : (this.jobData?.companyImages || []));
    const validImages = rawImages
      .filter((img: any) => typeof img === 'string' && img.trim().length > 0)
      .map((img: string) => img.trim());

    if (!validImages.length) {
      if (this.jobData?.companyLogo) {
        validImages.push(this.jobData.companyLogo);
      } else {
        validImages.push('assets/LogoChambee.png');
      }
    }

    this.modalGaleriaImagenes = validImages;
    this.modalGaleriaIndex = Math.max(0, Math.min(index, validImages.length - 1));
    this.modalGaleriaAbierto = true;
  }

  cerrarModalGaleria(): void {
    this.modalGaleriaAbierto = false;
  }

  anteriorImagenGaleria(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.modalGaleriaImagenes.length <= 1) return;
    this.modalGaleriaIndex = (this.modalGaleriaIndex - 1 + this.modalGaleriaImagenes.length) % this.modalGaleriaImagenes.length;
  }

  siguienteImagenGaleria(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.modalGaleriaImagenes.length <= 1) return;
    this.modalGaleriaIndex = (this.modalGaleriaIndex + 1) % this.modalGaleriaImagenes.length;
  }

  seleccionarImagenGaleria(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.modalGaleriaIndex = index;
  }

  cargarComentarios(id: string | null) {
    if (!id) return;

    this.api.obtenerComentariosAnuncio(id).subscribe({
      next: (data: any[]) => {
        this.comentarios = (data || []).map((c) => ({
          id: c.id_comentario,
          autor: `${c.nombre_postulante || 'Usuario'} ${c.apellido_paterno_postulante || ''}`.trim(),
          texto: c.texto,
          fecha: new Date(c.fecha_comentario).toLocaleDateString('es-MX'),
          esMio: this.usuarioActual?.id === c.id_postulante,
          editando: false,
          textoEditado: ''
        }));
      },
      error: (err) => {
        console.error('Error al cargar comentarios:', err);
        this.comentarios = [];
      }
    });
  }

  agregarComentario() {
    if (!this.nuevoComentario.trim() || !this.jobId) return;

    this.enviandoComentario = true;

    this.api.agregarComentario(this.jobId, this.usuarioActual?.id, this.nuevoComentario.trim()).subscribe({
      next: (nuevo: any) => {
        this.comentarios.unshift({
          id: nuevo.id_comentario,
          autor: `${nuevo.nombre_postulante || this.usuarioActual?.nombre || 'Tú'} ${nuevo.apellido_paterno_postulante || ''}`.trim(),
          texto: nuevo.texto,
          fecha: 'Justo ahora',
          esMio: true,
          editando: false,
          textoEditado: ''
        });

        this.nuevoComentario = '';
        this.enviandoComentario = false;
        this.mostrarModalExito('Tu comentario se publicó correctamente.');
      },
      error: (err) => {
        console.error('Error al publicar comentario:', err);
        this.enviandoComentario = false;
        this.mostrarModal('No fue posible publicar tu comentario. Intenta de nuevo.');
      }
    });
  }

  toggleDropdown(index: number) {
    this.dropdownOpenIndex = this.dropdownOpenIndex === index ? null : index;
  }

  editarComentario(index: number) {
    this.comentarios[index].editando = true;
    this.comentarios[index].textoEditado = this.comentarios[index].texto;
    this.dropdownOpenIndex = null;
  }

  guardarEdicion(index: number) {
    const comentario = this.comentarios[index];
    const textoModificado = comentario.textoEditado.trim();
    if (!textoModificado) return;

    this.api.editarComentario(comentario.id, this.usuarioActual?.id, textoModificado).subscribe({
      next: () => {
        comentario.texto = textoModificado;
        comentario.editando = false;
        this.mostrarModalExito('Comentario actualizado correctamente.');
      },
      error: (err) => {
        console.error('Error al editar comentario:', err);
        this.mostrarModal('No fue posible editar el comentario.');
      }
    });
  }

  cancelarEdicion(index: number) {
    this.comentarios[index].editando = false;
  }

  eliminarComentario(index: number) {
    this.dropdownOpenIndex = null;
    const comentario = this.comentarios[index];

    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;

    this.api.eliminarComentario(comentario.id, this.usuarioActual?.id).subscribe({
      next: () => {
        this.comentarios.splice(index, 1);
      },
      error: (err) => {
        console.error('Error al eliminar comentario:', err);
        this.mostrarModal('No fue posible eliminar el comentario.');
      }
    });
  }

  abrirModalReporte(): void {
    this.motivoReporte = '';
    this.detalleReporte = '';
    const modal = document.getElementById('modalReporte');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModalReporte(): void {
    const modal = document.getElementById('modalReporte');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  enviarReporte(): void {
    if (!this.jobId || !this.motivoReporte) return;

    this.enviandoReporte = true;

    const payload = {
      id_anuncio: this.jobId,
      id_postulante: this.usuarioActual?.id || this.usuarioActual?.id_postulante,
      motivo: this.motivoReporte,
      detalle: this.detalleReporte
    };

    this.api.reportarAnuncio(payload).subscribe({
      next: () => {
        this.enviandoReporte = false;
        this.cerrarModalReporte();
        this.mostrarModalExito('El anuncio ha sido reportado exitosamente.');
      },
      error: (err) => {
        this.enviandoReporte = false;
        console.error('Error al enviar el reporte:', err);
        this.mostrarModal('Hubo un error al enviar tu reporte.');
      }
    });
  }

  private verificarEstadoPostulacion(id: string | null) {
    if (!id || this.usuarioActual?.rol !== 'postulante') return;

    this.api.obtenerPostulacionesPostulante(this.usuarioActual.id).subscribe({
      next: (postulaciones: any[]) => {
        this.yaPostulado = postulaciones.some((p: any) => String(p.id_anuncio) === String(id));
      },
      error: () => {
        this.yaPostulado = false;
      }
    });
  }

  postular(): void {
    if (!this.jobId || this.yaPostulado) return;

    // Si no hay sesión activa como postulante, redirigir al login
    if (!this.estaLogueado || this.usuarioActual?.rol !== 'postulante') {
      this.router.navigate(['/login']);
      return;
    }

    this.api.postularAAnuncio(this.jobId).subscribe({
      next: () => {
        this.yaPostulado = true;
        this.mostrarModalExito('Postulación enviada con éxito.');
      },
      error: (err) => {
        console.error('Error al postular:', err);
        // Si no tiene permiso o no hay sesión, redirigir a login
        if (err.status === 401 || err.status === 403) {
          this.router.navigate(['/login']);
          return;
        }
        this.mostrarModal(err.error?.error || 'No fue posible completar la postulación.');
      }
    });
  }

  toggleFavorito(): void {
    if (!this.jobId || this.guardandoFavorito) return;

    // Si no hay sesión activa como postulante, redirigir al login
    if (!this.estaLogueado || this.usuarioActual?.rol !== 'postulante') {
      this.router.navigate(['/login']);
      return;
    }

    this.guardandoFavorito = true;
    const accion$ = this.esFavorito
      ? this.api.eliminarFavorito(this.jobId)
      : this.api.guardarFavorito(this.jobId);

    accion$.subscribe({
      next: (response: any) => {
        this.esFavorito = Boolean(response?.favorito);
        const mensaje = this.esFavorito
          ? 'Vacante guardada en favoritos.'
          : 'Vacante eliminada de favoritos.';
        this.mostrarModalExito(mensaje);
        this.guardandoFavorito = false;
      },
      error: (err) => {
        console.error('Error al actualizar favorito:', err);
        this.mostrarModal(err.error?.error || 'No fue posible actualizar tus favoritos.');
        this.guardandoFavorito = false;
      }
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  openService(index: number) {
    const servicio = this.services[index];
    if (!servicio) return;
    const id = servicio.id_servicio || servicio.id;
    if (!id) return;

    this.servicioDetalleCargando = true;
    this.servicioDetalleOpen = true;

    this.api.obtenerServicioDetalle(String(id)).subscribe({
      next: (detalle) => {
        this.servicioDetalle = detalle;
        this.servicioDetalleCargando = false;
      },
      error: (err) => {
        console.error('Error al cargar detalle del servicio:', err);
        this.servicioDetalle = servicio;
        this.servicioDetalleCargando = false;
      }
    });
  }

  cerrarDetalleServicio() {
    this.servicioDetalleOpen = false;
    this.servicioDetalle = null;
  }

  verPerfilAutor(autorId: string) {
    if (autorId) {
      this.cerrarDetalleServicio();
      this.router.navigate(['/perfil-postulante', autorId]);
    }
  }

  checkMobile() {
    try {
      this.isMobile = window.innerWidth <= 768;
    } catch {
      this.isMobile = false;
    }
  }

  logout() {
    this.authApi.logout();
    this.menuOpen = false;
    this.servicesOpen = false;
  }

  private registrarVista(id: string | number) {
    const strId = String(id);
    let historial: string[] = [];
    const stored = localStorage.getItem('chambee_vistos_recientemente');
    if (stored) {
      try {
        historial = JSON.parse(stored);
      } catch (e) {
        historial = [];
      }
    }
    historial = historial.filter(itemId => itemId !== strId);
    historial.unshift(strId);
    if (historial.length > 10) {
      historial = historial.slice(0, 10);
    }
    localStorage.setItem('chambee_vistos_recientemente', JSON.stringify(historial));
  }

  irAlPerfil(): void {
    this.router.navigate(['/perfil-postulante']);
  }

  openJob(id?: string | number) {
    if (id) {
      this.registrarVista(id);
      this.router.navigate(['/job', id]);
    }
  }

  goBack(): void {
    this.location.back();
  }

  verOtroEmpleo(id: string): void {
    this.router.navigate(['/job', id]);
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  verPerfilEmpresa(): void {
    if (!this.jobData?.employerId) {
      return;
    }
    // Si no hay sesión activa como postulante (o admin), redirigir al login
    if (!this.estaLogueado || (this.usuarioActual?.rol !== 'postulante' && !this.isAdminView)) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/empresa', this.jobData.employerId]);
  }

  toggleVerMas(): void {
    this.mostrarMapa = !this.mostrarMapa;

    if (this.mostrarMapa && isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 150);
    }
  }

  cargarDetalles(id: string | null): void {
    if (!id) {
      this.jobData = null;
      this.relatedJobs = [];
      return;
    }

    const usuario = this.api.getUsuario();
    const etiquetas$ = usuario?.rol === 'postulante'
      ? this.api.obtenerMisEtiquetas().pipe(catchError(() => of({ etiquetas: [] })))
      : of({ etiquetas: [] });

    forkJoin({
      anuncios: this.api.obtenerAnunciosPublicos(),
      preferencias: etiquetas$
    }).subscribe({
      next: ({ anuncios, preferencias }) => {
        const anuncio = anuncios.find((item: any) => String(item.id_anuncio) === String(id));
        const intereses = Array.isArray(preferencias?.etiquetas) ? preferencias.etiquetas : [];

        if (!anuncio) {
          this.jobData = this.getFallbackData(id, 'Vacante no disponible');
          this.relatedJobs = [];
          return;
        }

        const categoriasActuales = anuncio.categorias || [];
        const ubicacion = this.formatearDireccion(anuncio);
        const monedaAnuncio = anuncio.moneda || anuncio.tipo_moneda || 'MXN';
        const periodoAnuncio = anuncio.periodo_pago || anuncio.periodo || 'Mensual';

        this.jobData = {
          id: anuncio.id_anuncio,
          employerId: anuncio.id_empleador,
          companyName: anuncio.nombre_empresa || 'Empresa Certificada',
          companyLogo: anuncio.foto_empresa || 'assets/LogoChambee.png',
          companyImages: anuncio.images?.length ? anuncio.images : [anuncio.img || anuncio.foto_empresa || 'assets/LogoChambee.png'],
          companyDesc: anuncio.descripcion_empresa || 'Empresa activa en Chambee.',
          title: anuncio.titulo || 'Vacante',
          urgency: anuncio.urgencia || 'Normal',
          edad: anuncio.edad || 'Sin especificar',
          escolaridad: anuncio.educacion || 'Sin especificar',
          experiencia: anuncio.experiencia || 'Sin especificar',
          disponibilidad: anuncio.modalidad || 'Presencial',
          higiene: anuncio.descripcion || 'Consulta la publicacion para conocer mas detalles.',
          salario: anuncio.salario,
          moneda: monedaAnuncio,
          periodoPago: periodoAnuncio,
          salarioFormateado: this.formatearSalario(anuncio.salario, monedaAnuncio, periodoAnuncio),
          vistas: anuncio.vistas || 0,
          applicants: parseInt(anuncio.postulaciones_count) || 0,
          direccion: ubicacion,
          ubicacion: ubicacion,
          latitud: anuncio.latitud,
          longitud: anuncio.longitud,
          tags: categoriasActuales,
          interesMatch: this.calcularCoincidencias(categoriasActuales, intereses) > 0
        };

        if (this.jobData.id) {
          this.api.registrarVistaAnuncio(this.jobData.id).subscribe({
            next: (res) => {
              if (this.jobData && res.vistas) {
                this.jobData.vistas = res.vistas;
              }
            },
            error: (err) => console.error('Error al registrar vista:', err)
          });
        }

        this.jobs = anuncios.map((a: any) => ({
          id: a.id_anuncio,
          company: a.nombre_empresa || 'Empresa',
          title: a.titulo,
          salary: this.formatearSalario(a.salario, a.moneda || 'MXN', a.periodo_pago || 'Mensual'),
          img: a.img || '',
          urgency: a.urgencia || 'Normal',
          rating: a.modalidad || 'Empleo',
          applicants: parseInt(a.postulaciones_count) || 0,
          applicantsFotos: a.postulantes_fotos || [],
          tags: a.categorias || [],
          matchScore: 0
        }));

        this.relatedJobs = anuncios
          .filter((item: any) => String(item.id_anuncio) !== String(id))
          .map((item: any) => {
            const fotos = Array.isArray(item.images) && item.images.length
              ? item.images
              : (item.img ? [item.img] : (item.foto_empresa ? [item.foto_empresa] : ['assets/LogoChambee.png']));
            return {
              id: item.id_anuncio,
              company: item.nombre_empresa || 'Empresa',
              title: item.titulo || 'Vacante',
              salary: this.formatearSalario(item.salario, item.moneda || 'MXN', item.periodo_pago || 'Mensual'),
              img: fotos[0] || 'assets/LogoChambee.png',
              images: fotos,
              rating: item.modalidad || 'Empleo',
              applicants: parseInt(item.postulaciones_count) || 0,
              applicantsFotos: item.postulantes_fotos || [],
              tags: item.categorias || [],
              score: this.calcularCoincidencias(item.categorias || [], categoriasActuales) * 2
                + this.calcularCoincidencias(item.categorias || [], intereses)
            };
          })
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 4);

        this.cargarEstadoFavorito(id);
      },
      error: (err) => {
        console.error('Error al obtener anuncios:', err);
        this.jobData = this.getFallbackData(id, 'Error al cargar datos');
        this.relatedJobs = [];
      }
    });
  }

  private cargarFotoPerfil(): void {
    const usuario = this.api.getUsuario();

    if (!usuario?.id) return;

    this.api.getMiPerfil().subscribe({
      next: (perfil: any) => {
        this.nombre_postulante = perfil?.nombre_postulante || 'Usuario';
        this.foto_perfil = perfil?.foto_perfil || '';
      },
      error: (err) => {
        this.nombre_postulante = usuario?.nombre || 'Usuario';
      }
    });
  }

  private cargarEstadoFavorito(id: string): void {
    const usuario = this.api.getUsuario();

    if (usuario?.rol !== 'postulante') {
      this.esFavorito = false;
      return;
    }

    this.api.revisarFavorito(id).subscribe({
      next: (response: any) => {
        this.esFavorito = Boolean(response?.favorito);
      },
      error: () => {
        this.esFavorito = false;
      }
    });
  }

  private initMap(): void {
    if (!this.jobData?.direccion) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const iconDefault = L.icon({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.jobData.direccion)}`;

    this.http.get<any[]>(url).subscribe({
      next: (resultado) => {
        let lat = 20.5888;
        let lon = -100.3899;

        if (resultado?.length) {
          lat = Number.parseFloat(resultado[0].lat);
          lon = Number.parseFloat(resultado[0].lon);
        }

        this.map = L.map('map').setView([lat, lon], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: 'OpenStreetMap contributors'
        }).addTo(this.map);

        L.marker([lat, lon]).addTo(this.map)
          .bindPopup(`<b>${this.jobData.companyName}</b><br>${this.jobData.title}`)
          .openPopup();

        setTimeout(() => this.map?.invalidateSize(), 200);
      },
      error: (err) => console.error('Error de geocodificacion:', err)
    });
  }

  private getFallbackData(id: string | null, title: string): any {
    return {
      id,
      employerId: null,
      companyName: 'Chambee',
      companyLogo: 'assets/LogoChambee.png',
      companyDesc: 'No fue posible cargar los detalles de la vacante.',
      title,
      urgency: 'Normal',
      edad: 'Sin especificar',
      escolaridad: 'Sin especificar',
      experiencia: 'Sin especificar',
      disponibilidad: 'Sin especificar',
      higiene: 'No fue posible cargar los detalles.',
      salario: null,
      salarioFormateado: 'Salario a convenir',
      vistas: 0,
      direccion: 'Ubicacion no disponible',
      ubicacion: 'Ubicacion no disponible',
      tags: [],
      interesMatch: false
    };
  }

  private formatearDireccion(anuncio: any): string {
    if (anuncio.direccion_formateada) {
      return anuncio.direccion_formateada;
    }
    return [
      anuncio.calle,
      anuncio.numero_exterior,
      anuncio.colonia,
      anuncio.ciudad,
      anuncio.estado,
      anuncio.codigo_postal ? `CP ${anuncio.codigo_postal}` : ''
    ].filter(Boolean).join(', ');
  }

  private calcularCoincidencias(origen: string[], destino: string[]): number {
    if (!origen.length || !destino.length) return 0;
    const base = new Set(destino.map((item) => String(item).toLowerCase()));
    return origen.filter((item) => base.has(String(item).toLowerCase())).length;
  }

  formatearSalario(monto: any, moneda: string = 'MXN', periodo: string = 'Mensual'): string {
    if (!monto) return 'Salario no especificado';
    const num = parseFloat(monto);
    if (isNaN(num) || num === 0) return 'Salario a convenir';

    const divisa = (moneda || 'MXN').toUpperCase();
    const frecuencia = (periodo || 'Mensual').toLowerCase();
    return `${divisa} $${num.toLocaleString('es-MX')} / ${frecuencia}`;
  }

  modalMensaje = '';

  abrirModal() {
    this.mostrarModal("¿Estás seguro de querer eliminar esta publicación?");
  }

  mostrarModal(mensaje: string) {
    this.modalMensaje = mensaje;
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

  mostrarModalExito(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalSaludo');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModalExito() {
    const modal = document.getElementById('modalSaludo');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  onSearchInput(value: string) {
    this.showSearchDropdown = true;
    if (value && value.trim().length > 0) {
      this.searchSubject.next(value);
    } else {
      this.searchResults = [];
    }
  }

  ejecutarBusqueda(query: string) {
    const tokens = this.normalizarTexto(query).split(/\s+/).filter(t => t.length > 0);

    const jobsResults = this.jobs.filter(job => {
      const textoCompleto = this.normalizarTexto(`${job.title} ${job.company} ${job.tags.join(' ')}`);
      return tokens.every(token => textoCompleto.includes(token));
    }).map(j => ({ ...j, tipo: 'empleo' }));

    const servicesResults = this.services.filter(service => {
      const titulo = service.title || service.titulo || '';
      const desc = service.description || service.descripcion || '';
      const cat = service.categoria || '';
      const textoCompleto = this.normalizarTexto(`${titulo} ${desc} ${cat}`);
      return tokens.every(token => textoCompleto.includes(token));
    }).map(s => ({ ...s, tipo: 'servicio' }));

    this.searchResults = [...jobsResults, ...servicesResults].slice(0, 6);
  }

  cerrarBuscador() {
    setTimeout(() => {
      this.showSearchDropdown = false;
    }, 200);
  }

  irAResultado(resultado: any) {
    const titleToSave = resultado.title || resultado.titulo || resultado.categoria || '';
    this.guardarBusquedaReciente(this.searchTerm || titleToSave);
    this.showSearchDropdown = false;
    this.searchTerm = '';

    if (resultado.tipo === 'empleo') {
      this.openJob(resultado.id || resultado.id_anuncio);
    } else {
      const idx = this.services.findIndex(s => (s.id_servicio || s.id) === (resultado.id_servicio || resultado.id));
      if (idx !== -1) this.openService(idx);
    }
  }

  cargarBusquedasRecientes() {
    const stored = localStorage.getItem('chambee_busquedas_recientes');
    if (stored) {
      try {
        this.recentSearches = JSON.parse(stored);
      } catch {
        this.recentSearches = [];
      }
    }
  }

  guardarBusquedaReciente(term: string) {
    if (!term || term.trim() === '') return;
    let searches = [...this.recentSearches];
    searches = searches.filter(t => this.normalizarTexto(t) !== this.normalizarTexto(term));
    searches.unshift(term);
    if (searches.length > 4) searches = searches.slice(0, 4);
    this.recentSearches = searches;
    localStorage.setItem('chambee_busquedas_recientes', JSON.stringify(searches));
  }

  seleccionarBusquedaReciente(term: string) {
    this.searchTerm = term;
    this.showSearchDropdown = false;
    this.router.navigate(['/search'], { queryParams: { q: term } });
  }

  verTodosResultados() {
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      this.guardarBusquedaReciente(this.searchTerm);
      this.showSearchDropdown = false;
      this.router.navigate(['/search'], { queryParams: { q: this.searchTerm } });
    }
  }

  highlightText(text: string | null | undefined, query: string): string {
    if (!text) return '';
    if (!query) return text;
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeQuery})`, 'gi');
    return text.replace(regex, '<span class="text-highlight">$1</span>');
  }

  private normalizarTexto(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.toLowerCase().trim();
    if (typeof value === 'object') return JSON.stringify(value).toLowerCase().trim();
    return String(value).toLowerCase().trim();
  }
}