import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms'; 
import * as L from 'leaflet';

import { JobCardComponent } from '../../components/job-card/job-card.component';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  applicantId?: string;
}

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, JobCardComponent, FormsModule], 
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.css'
})
export class JobDetailComponent implements OnInit {
  foto_perfil = '';
  jobId: string | null = null;
  jobData: any = null;
  relatedJobs: any[] = [];
  mostrarMapa = false;
  esFavorito = false;
  guardandoFavorito = false;

  // NOTIFICACIONES Y MENÚ
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = false;
  notifications: NotificationItem[] = [];

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

  private map: L.Map | null = null;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private platformId = inject(PLATFORM_ID);
  private themeService = inject(ThemeService);
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    // Obtenemos el usuario para validar su rol
    this.usuarioActual = this.api.getUsuario();

    // Cargar notificaciones al iniciar
    if (this.usuarioActual) {
      this.cargarNotificaciones();
    }

    this.route.paramMap.subscribe((params) => {
      this.jobId = params.get('id');
      this.mostrarMapa = false;
      this.esFavorito = false;
      this.cargarDetalles(this.jobId);
      this.cargarComentarios(this.jobId);
    });

    this.cargarFotoPerfil();
  }

  // ================= NOTIFICACIONES =================
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

  // ==================================================

  // Cargar comentarios
  cargarComentarios(id: string | null) {
    if (!id) return;
    
    // Simulación de datos.
    this.comentarios = [
      { 
        autor: 'María López', 
        texto: 'Trabajé aquí hace 2 años, el ambiente es excelente y pagan puntual.', 
        fecha: 'Hace 2 días',
        esMio: false,
        editando: false,
        textoEditado: ''
      },
      { 
        autor: 'Carlos Ramírez', 
        texto: '¿Alguien sabe si el horario es flexible? Me interesa mucho.', 
        fecha: 'Hace 1 semana',
        esMio: false,
        editando: false,
        textoEditado: ''
      }
    ];
  }

  // Enviar nuevo comentario
  agregarComentario() {
    if (!this.nuevoComentario.trim() || !this.jobId) return;

    this.enviandoComentario = true;

    setTimeout(() => {
      this.comentarios.unshift({
        autor: 'Tú', // Aquí irá el nombre real del usuario
        texto: this.nuevoComentario,
        fecha: 'Justo ahora',
        esMio: true, 
        editando: false,
        textoEditado: ''
      });
      
      this.nuevoComentario = '';
      this.enviandoComentario = false;
      this.mostrarModalExito('Tu comentario se publicó correctamente.');
    }, 800);
  }

  // ================= METODOS DE EDICIÓN Y ELIMINACIÓN =================

  toggleDropdown(index: number) {
    this.dropdownOpenIndex = this.dropdownOpenIndex === index ? null : index;
  }

  editarComentario(index: number) {
    this.comentarios[index].editando = true;
    this.comentarios[index].textoEditado = this.comentarios[index].texto;
    this.dropdownOpenIndex = null; 
  }

  guardarEdicion(index: number) {
    const textoModificado = this.comentarios[index].textoEditado.trim();
    if (textoModificado) {
      this.comentarios[index].texto = textoModificado;
      this.comentarios[index].editando = false;
      this.mostrarModalExito('Comentario actualizado correctamente.');
    }
  }

  cancelarEdicion(index: number) {
    this.comentarios[index].editando = false;
  }

  eliminarComentario(index: number) {
    this.dropdownOpenIndex = null; 
    
    if (confirm('¿Estás seguro de que deseas eliminar este comentario?')) {
      this.comentarios.splice(index, 1);
    }
  }

  // ================= METODOS DE REPORTE ==============================

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

    // Construimos el objeto que se enviará al backend
    const payload = {
      id_anuncio: this.jobId,
      id_postulante: this.usuarioActual?.id || this.usuarioActual?.id_postulante,
      motivo: this.motivoReporte,
      detalle: this.detalleReporte
    };

    // Llamada real al servicio
    this.api.reportarAnuncio(payload).subscribe({
      next: () => {
        this.enviandoReporte = false;
        this.cerrarModalReporte();
        this.mostrarModalExito('El anuncio ha sido reportado exitosamente. Nuestro equipo lo revisará a la brevedad para garantizar la seguridad.');
      },
      error: (err) => {
        this.enviandoReporte = false;
        console.error('Error al enviar el reporte:', err);
        this.mostrarModal('Hubo un error al enviar tu reporte. Por favor, inténtalo de nuevo.');
      }
    });
  }

  // ====================================================================

  postular(): void {
    if (!this.jobId) return;

    this.api.postularAAnuncio(this.jobId).subscribe({
      next: () => {
        this.mostrarModalExito('Postulación enviada con éxito. El empleador revisará tu perfil pronto.');
      },
      error: (err) => {
        console.error('Error al postular:', err);
        this.mostrarModal(err.error?.error || 'No fue posible completar la postulación.');
      }
    });
  }

  toggleFavorito(): void {
    if (!this.jobId || this.guardandoFavorito) return;

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

  irAlPerfil(): void {
    this.router.navigate(['/perfil-postulante']);
  }

  goBack(): void {
    this.location.back();
  }

  verOtroEmpleo(id: string): void {
    this.router.navigate(['/job', id]);
  }

  verPerfilEmpresa(): void {
    if (!this.jobData?.employerId) {
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

        this.jobData = {
          id: anuncio.id_anuncio,
          employerId: anuncio.id_empleador,
          companyName: anuncio.nombre_empresa || 'Empresa Certificada',
          companyLogo: anuncio.foto_empresa || 'assets/LogoChambee.png',
          companyDesc: anuncio.descripcion_empresa || 'Empresa activa en Chambee.',
          title: anuncio.titulo || 'Vacante',
          urgency: anuncio.urgencia || 'Normal',
          edad: anuncio.edad || 'Sin especificar',
          escolaridad: anuncio.educacion || 'Sin especificar',
          experiencia: anuncio.experiencia || 'Sin especificar',
          disponibilidad: anuncio.modalidad || 'Presencial',
          higiene: anuncio.descripcion || 'Consulta la publicacion para conocer mas detalles.',
          salario: anuncio.salario,
          vistas: anuncio.vistas || 0,
          direccion: ubicacion,
          ubicacion,
          tags: categoriasActuales,
          interesMatch: this.calcularCoincidencias(categoriasActuales, intereses) > 0
        };

        this.relatedJobs = anuncios
          .filter((item: any) => String(item.id_anuncio) !== String(id))
          .map((item: any, index: number) => ({
            id: item.id_anuncio,
            company: item.nombre_empresa || 'Empresa',
            title: item.titulo || 'Vacante',
            salary: this.formatearSalario(item.salario),
            img: 'https://picsum.photos/30' + ((index % 9) + 1) + '/150',
            rating: item.modalidad || 'Empleo',
            applicants: item.vistas || 0,
            tags: item.categorias || [],
            score: this.calcularCoincidencias(item.categorias || [], categoriasActuales) * 2
              + this.calcularCoincidencias(item.categorias || [], intereses)
          }))
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
        this.foto_perfil = perfil?.foto_perfil || '';
      },
      error: (err) => {
        console.log('No se pudo cargar la foto de perfil:', err);
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
          lat = parseFloat(resultado[0].lat);
          lon = parseFloat(resultado[0].lon);
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
      vistas: 0,
      direccion: 'Ubicacion no disponible',
      ubicacion: 'Ubicacion no disponible',
      tags: [],
      interesMatch: false
    };
  }

  private formatearDireccion(anuncio: any): string {
    return [
      anuncio.calle,
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

  private formatearSalario(salario: string | number): string {
    const numero = Number(salario);
    if (Number.isNaN(numero) || numero === 0) return 'Salario a convenir';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(numero);
  }

  // Modales
  modalMensaje = '';

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
}