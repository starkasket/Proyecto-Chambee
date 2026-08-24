import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { DireccionCompleta, GoogleMapsService } from '../../services/google-maps.service';
import { MapaUbicacionComponent } from '../../components/mapa-ubicacion/mapa-ubicacion.component';
import { NotificacionService, NotificationItem } from '../../services/notificacion.service';


interface JobManageItem {
  id: string;
  titulo: string;
  descripcion: string;
  img?: string | null;
  ubicacion: string;
  fecha: string;
  candidatos: number;
  estado: 'Activa' | 'Borrador' | 'Oculta' | 'Cerrada';
  modalidad: string;
  categorias: string[];
  tipo_anuncio: string;
  urgencia: string;
  edad: string;
  educacion: string;
  estadoUbicacion: string;
  ciudad: string;
  colonia: string;
  calle: string;
  numero_exterior: string;
  latitud: number;
  longitud: number;
  direccion_formateada: string;
  codigo_postal: string;
  salario: number;
  tipo_moneda: string;
  periodo_pago: string;
}

/* interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
} */

@Component({
  selector: 'app-employer-jobs-manage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MapaUbicacionComponent],
  templateUrl: './employer-jobs-manage.component.html',
  styleUrl: './employer-jobs-manage.component.css'
})
export class EmployerJobsManageComponent implements OnInit {
  employerId = '';
  empresaNombre = 'Empresa';
  vacantes: JobManageItem[] = [];
  vacanteSeleccionadaId = '';
  cargando = true;
  guardando = false;
  actualizandoEstado = false;
  error = '';
  modalMensaje = '';
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = false;
  isMobile = false;
  categoriasDisponibles: string[] = [];
  colonias: string[] = [];
  sepomex: any[] = [];
  originalFormValue: ReturnType<EmployerJobsManageComponent['form']['getRawValue']> | null = null;
  modalMensajePendiente: string = '';
  previewUrl: string | null = null;
  archivoSeleccionado: File | null = null;
  fileName = 'Ningun archivo seleccionado';
  subiendoImagen = false;
  urlImagenSubida = '';
  mostrarEliminarImagen = false;

  notifications: NotificationItem[] = [];



  readonly opcionesEdad = [
    'Sin especificar',
    '18+',
    '18-25 años',
    '26-35 años',
    '36-45 años',
    '46+'
  ];

  readonly opcionesEducacion = [
    'Sin especificar',
    'Secundaria',
    'Preparatoria',
    'Técnico',
    'Universidad trunca',
    'Licenciatura',
    'Ingeniería',
    'Maestría'
  ];

// Periodicidad del pago
  readonly opcionesPeriodo = [
    'Por día',
    'Semanal',
    'Quincenal',
    'Mensual'
  ];

  // Opciones de moneda según tu select
  readonly opcionesMoneda = ['Peso mexicano', 'Dólar estadounidense', 'Euro'];

  // Salarios mínimos de referencia en México (MXN)
  readonly salariosMinimosMXN: Record<string, number> = {
    'Por día': 278.00,
    'Semanal': 1950.00,
    'Quincenal': 4182.00,
    'Mensual': 8364.00
  };

  // Mapeo a códigos de moneda cortos
  readonly codigosMoneda: Record<string, string> = {
    'Peso mexicano': 'MXN',
    'Dólar estadounidense': 'USD',
    'Euro': 'EUR'
  };

  // Tipos de cambio aproximados frente al Peso Mexicano (MXN)
  readonly tiposCambio: Record<string, number> = {
    'Peso mexicano': 1,
    'Dólar estadounidense': 20.00,
    'Euro': 20.5
  };

  // Mapeo inverso: código → nombre largo
  readonly nombreMoneda: Record<string, string> = {
    'MXN': 'Peso mexicano',
    'USD': 'Dólar estadounidense',
    'EUR': 'Euro'
  };

  codigoANombreMoneda(codigo: string): string {
    return this.nombreMoneda[codigo] || codigo;
  }

  // Getter del equivalente en la moneda seleccionada
  get salarioMinimoSugerido(): number {
    const periodo = this.form.get('periodo_pago')?.value || 'Mensual';
    const moneda = this.form.get('tipo_moneda')?.value || 'Peso mexicano';
    const minimoMXN = this.salariosMinimosMXN[periodo] || 0;
    const tasa = this.tiposCambio[moneda] || 1;

    return minimoMXN / tasa;
  }

  // Getter del código de moneda (MXN, USD, EUR)
  get codigoMonedaActivo(): string {
    const moneda = this.form.get('tipo_moneda')?.value || 'Peso mexicano';
    return this.codigosMoneda[moneda] || 'MXN';
  }
  
  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(160)]],
    descripcion: ['', [Validators.required, Validators.maxLength(400)]],
    tipo_anuncio: ['Empleo', [Validators.required]],
    urgencia: ['Normal', [Validators.required]],
    edad: ['Sin especificar'],
    educacion: ['Sin especificar'],
    estado: ['', [Validators.required]],
    ciudad: ['', [Validators.required]],
    colonia: ['', [Validators.required]],
    calle: ['', [Validators.required]],
    numero_exterior: ['', [Validators.maxLength(20)]],
    latitud: [null as number | null],
    longitud: [null as number | null],
    direccion_formateada: ['', Validators.maxLength(300)],
    codigo_postal: ['', [Validators.required, Validators.maxLength(10)]],
    salario: [null as number | null, [Validators.required, Validators.min(1)]],
    tipo_moneda: ['MXN', [Validators.required]],
    periodo_pago: ['Mensual', [Validators.required]],
    modalidad: ['Presencial', [Validators.required]],
    etiquetas: this.fb.nonNullable.control<string[]>([], [Validators.required])
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private readonly authApi: AuthService,
    private notificacionService: NotificacionService,
    private googleMaps: GoogleMapsService
  ) { }

  ngOnInit(): void {
    const usuario = this.api.getUsuario();

    if (!usuario || usuario.rol !== 'empleador' || !usuario.id) {
      this.error = 'Necesitas iniciar sesión como empleador para administrar vacantes.';
      this.cargando = false;
      return;
    }

    
    this.employerId = usuario.id;
    this.empresaNombre = usuario.nombre || this.empresaNombre;

    this.notificacionService.inicializar(usuario.id, usuario.rol);

    this.api.obtenerCategorias().subscribe({
      next: (categorias) => {
        this.categoriasDisponibles = categorias.map((categoria) => categoria.nombre);
      },
      error: () => {
        this.categoriasDisponibles = [];
      }
    });

    this.api.getSepomex().subscribe({
      next: (data) => {
        this.sepomex = data;
      }
    });
    this.notificacionService.notifications$.subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );

    this.notificacionService.hasUnreadNotifications$.subscribe(
      hasUnread => {
        this.hasUnreadNotifications = hasUnread;
      }
    );


    this.cargarVacantes();
    this.checkMobile();
  }

   toggleNotifications(event?: Event) {

    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen = !this.notificationsOpen;
    if (
      this.notificationsOpen &&
      this.hasUnreadNotifications
    ) {
      this.notificacionService.marcarTodasComoLeidas();
    }
    this.menuOpen = false;
  }

  onNotificationClick( notif: NotificationItem, event: Event) {
    event.stopPropagation();
    this.notificationsOpen = false;
    this.notificacionService.abrirNotificacion(notif);
  }
  cargarVacantes() {
    this.cargando = true;
    this.api.obtenerAnunciosEmpleador(this.employerId).subscribe({
      next: (anuncios) => {
        this.vacantes = anuncios.map((anuncio) => ({
          id: anuncio.id_anuncio,
          titulo: anuncio.titulo,
          descripcion: anuncio.descripcion,
          img: anuncio.img || null,
          ubicacion: `${anuncio.ciudad}, ${anuncio.estado}`,
          fecha: this.formatearFecha(anuncio.fecha_publicacion),
          candidatos: anuncio.postulaciones_count ?? anuncio.vistas ?? 0,
          estado: this.mapAnnouncementState(anuncio.estado_anuncio),
          modalidad: anuncio.modalidad || 'Presencial',
          categorias: anuncio.categorias || [],
          tipo_anuncio: anuncio.tipo_anuncio || 'Empleo',
          urgencia: anuncio.urgencia || 'Normal',
          edad: anuncio.edad || 'Sin especificar',
          educacion: anuncio.educacion || 'Sin especificar',
          estadoUbicacion: anuncio.estado || '',
          ciudad: anuncio.ciudad || '',
          colonia: anuncio.colonia || '',
          calle: anuncio.calle || '',
          numero_exterior: anuncio.numero_exterior || '',
          latitud: anuncio?.latitud ?? null,
          longitud: anuncio?.longitud ?? null,
          direccion_formateada: anuncio?.direccion_formateada || '',
          codigo_postal: anuncio.codigo_postal || '',
          salario: Number(anuncio.salario) || 0,
          tipo_moneda: this.codigoANombreMoneda(anuncio.moneda || anuncio.tipo_moneda || 'MXN'),
          periodo_pago: anuncio.periodo_pago || 'Mensual'
        }));

        if (this.vacantes.length) {
          const id = this.vacanteSeleccionadaId || this.vacantes[0].id;
          this.seleccionarVacante(id);
        } else {
          this.vacanteSeleccionadaId = '';
          this.resetImageState(null);
          this.form.reset({
            titulo: '',
            descripcion: '',
            tipo_anuncio: 'Empleo',
            urgencia: 'Normal',
            edad: 'Sin especificar',
            educacion: 'Sin especificar',
            estado: '',
            ciudad: '',
            colonia: '',
            calle: '',
            numero_exterior: '',
            latitud: null,
            longitud: null,
            direccion_formateada: '',
            codigo_postal: '',
            salario: null,
            tipo_moneda: 'MXN',
            periodo_pago: 'Mensual',
            modalidad: 'Presencial',
            etiquetas: []
          });
          this.originalFormValue = this.form.getRawValue();
        }

        this.cargando = false;

        if (this.modalMensajePendiente) {
          setTimeout(() => {
            this.mostrarModalExito(this.modalMensajePendiente);
            this.modalMensajePendiente = '';
          }, 300);
        }
      },
      error: () => {
        this.error = 'No fue posible cargar tus vacantes.';
        this.cargando = false;
        this.modalMensajePendiente = '';
      }
    });
  }

  seleccionarVacante(id: string) {
    this.vacanteSeleccionadaId = id;
    const vacante = this.vacantes.find((item) => item.id === id);

    if (!vacante) {
      this.mostrarModal('No fue posible cargar el detalle de la vacante.');
      return;
    }

    const etiquetas = Array.isArray(vacante.categorias) && vacante.categorias.length > 0
      ? vacante.categorias
      : [];

    this.form.reset({
      titulo: vacante.titulo || '',
      descripcion: vacante.descripcion || '',
      tipo_anuncio: vacante.tipo_anuncio || 'Empleo',
      urgencia: vacante.urgencia || 'Normal',
      edad: vacante.edad || 'Sin especificar',
      educacion: vacante.educacion || 'Sin especificar',
      estado: vacante.estadoUbicacion || '',
      ciudad: vacante.ciudad || '',
      colonia: vacante.colonia || '',
      calle: vacante.calle || '',
      numero_exterior: vacante.numero_exterior || '',
      latitud: vacante?.latitud ?? null,
      longitud: vacante?.longitud ?? null,
      direccion_formateada: vacante?.direccion_formateada || '',
      codigo_postal: vacante.codigo_postal || '',
      salario: vacante.salario || null,
      tipo_moneda: this.codigoANombreMoneda(vacante.tipo_moneda || 'MXN'),
      periodo_pago: vacante.periodo_pago || 'Mensual',
      modalidad: vacante.modalidad || 'Presencial',
      etiquetas: etiquetas
    });
    this.originalFormValue = this.form.getRawValue();
    this.form.markAsPristine();
    this.resetImageState(vacante);

    this.buscarCP(false);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const archivo = input.files[0];

    if (archivo.size > 2 * 1024 * 1024) {
      this.mostrarModal('La imagen no puede superar los 2 MB.');
      return;
    }

    this.archivoSeleccionado = archivo;
    this.urlImagenSubida = '';
    this.mostrarEliminarImagen = false;
    this.fileName = archivo.name.length > 30 ? archivo.name.substring(0, 27) + '...' : archivo.name;
    this.form.markAsDirty();

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(archivo);
  }

  async subirImagen(): Promise<string> {
    if (!this.archivoSeleccionado) {
      return this.urlImagenSubida;
    }

    this.subiendoImagen = true;

    try {
      const formData = new FormData();
      formData.append('file', this.archivoSeleccionado);
      formData.append('upload_preset', 'chambee_upload');

      const res = await fetch('https://api.cloudinary.com/v1_1/dqq9oeo4e/image/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('No se pudo subir la imagen.');
      }

      const data = await res.json();
      if (!data?.secure_url) {
        throw new Error('La respuesta de la imagen no fue valida.');
      }

      this.urlImagenSubida = data.secure_url;
      this.archivoSeleccionado = null;
      this.fileName = 'Imagen guardada';
      this.mostrarEliminarImagen = true;
      return this.urlImagenSubida;
    } finally {
      this.subiendoImagen = false;
    }
  }

  async subirImagenManual(): Promise<void> {
    try {
      await this.subirImagen();
    } catch (err: any) {
      this.mostrarModal(err?.message || 'Error al subir la imagen.');
    }
  }

  eliminarImagen(): void {
    this.previewUrl = null;
    this.archivoSeleccionado = null;
    this.fileName = 'Ningun archivo seleccionado';
    this.urlImagenSubida = '';
    this.mostrarEliminarImagen = false;
    this.form.markAsDirty();
  }

  async guardarCambios() {
    if (!this.vacanteSeleccionadaId) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarModal('Completa todos los campos requeridos antes de guardar.');
      return;
    }

    if (this.guardando) return;

    this.guardando = true;
    this.cerrarModal();
    this.modalMensajePendiente = 'La vacante se actualizó correctamente.';

    if (this.archivoSeleccionado && !this.urlImagenSubida) {
      try {
        await this.subirImagen();
      } catch (err: any) {
        this.guardando = false;
        this.modalMensajePendiente = '';
        this.mostrarModal(err?.message || 'Error al subir la imagen.');
        return;
      }
    }

    const payload = {
      ...this.form.getRawValue(),
      img: this.urlImagenSubida || null
    };

    this.api.actualizarAnuncioEmpleador(this.employerId, this.vacanteSeleccionadaId, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.cargarVacantes();
      },
      error: (err) => {
        this.guardando = false;
        this.modalMensajePendiente = '';
        const errorMsg = err?.error?.detail || err?.error?.error || 'No fue posible actualizar la vacante.';
        this.mostrarModal(`❌ Error: ${errorMsg}`);
      }
    });
  }

  guardarComoBorrador() {
    if (this.actualizandoEstado) return;
    this.cambiarEstado('BORRADOR', 'La vacante se guardó como borrador.');
  }

  ocultarVacante() {
    if (this.actualizandoEstado) return;
    this.cambiarEstado('OCULTO', 'La vacante fue ocultada. Ya no aparecerá públicamente.');
  }

  eliminarVacante() {
    if (this.actualizandoEstado) return;
    this.cambiarEstado('ELIMINADO', 'Se ha eliminado tu vacante.');
  }

  publicarVacante() {
    if (this.actualizandoEstado) return;
    this.cambiarEstado('ACTIVO', 'La vacante volvió a estar publicada.');
  }

  private cambiarEstado(estado: 'ACTIVO' | 'BORRADOR' | 'OCULTO' | 'ELIMINADO', mensaje: string) {
    if (!this.vacanteSeleccionadaId) {
      return;
    }

    if (this.actualizandoEstado) return;

    this.actualizandoEstado = true;
    this.cerrarModal();
    this.modalMensajePendiente = mensaje;

    this.api.actualizarEstadoAnuncioEmpleador(this.employerId, this.vacanteSeleccionadaId, estado).subscribe({
      next: () => {
        this.actualizandoEstado = false;
        if (estado === 'ELIMINADO') {
          this.vacanteSeleccionadaId = '';
        }
        this.cargarVacantes();
      },
      error: (err) => {
        this.actualizandoEstado = false;
        this.modalMensajePendiente = '';
        const errorMsg = err?.error?.detail || err?.error?.error || 'No fue posible cambiar el estado de la vacante.';
        this.mostrarModal(`❌ Error: ${errorMsg}`);
      }
    });
  }

  get etiquetasSeleccionadas(): string[] {
    return this.form.controls.etiquetas.value;
  }

  get hayCambiosPendientes(): boolean {
    return this.form.dirty;
  }

  descartarCambios() {
    if (!this.originalFormValue) {
      return;
    }

    this.form.reset(this.originalFormValue);
    this.form.markAsPristine();
    this.resetImageState(this.vacanteSeleccionada);
    this.buscarCP(false);
  }

  toggleEtiqueta(etiqueta: string) {
    const actuales = this.etiquetasSeleccionadas;
    const nuevas = actuales.includes(etiqueta)
      ? actuales.filter((item) => item !== etiqueta)
      : [...actuales, etiqueta];

    this.form.controls.etiquetas.setValue(nuevas);
    this.form.controls.etiquetas.markAsTouched();
  }

  campoInvalido(nombre: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[nombre];
    return Boolean(control.invalid && (control.touched || control.dirty));
  }

  buscarCP(mostrarError = true) {
    const cp = this.form.controls.codigo_postal.value;

    if (!cp) {
      if (mostrarError) {
        this.mostrarModal('Ingresa un código postal.');
      }
      return;
    }

    const resultados = this.sepomex.filter((r) => String(r.cp) === String(cp).trim());

    if (resultados.length > 0) {
      this.form.patchValue({
        estado: resultados[0].estado,
        ciudad: resultados[0].ciudad
      });
      this.colonias = resultados.map((r) => r.colonia);
    } else if (mostrarError) {
      this.colonias = [];
      this.mostrarModal('Código postal no encontrado.');
    }
  }

  get vacanteSeleccionada(): JobManageItem | null {
    return this.vacantes.find((vacante) => vacante.id === this.vacanteSeleccionadaId) || null;
  }

  getEstadoClase(estado: JobManageItem['estado']): string {
    if (estado === 'Activa') return 'state-active';
    if (estado === 'Borrador') return 'state-draft';
    return 'state-hidden';
  }

  crearNueva() {
    this.router.navigate(['/post-job']);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }



  toggleMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  logout() {
    this.authApi.logout();
  }

  volverPanel() {
    this.router.navigate(['/home-employer']);
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

  @HostListener('document:click')
  onDocumentClick() {
    if (this.notificationsOpen) {
      this.notificationsOpen = false;
    }
    if (this.menuOpen) {
      this.menuOpen = false;
    }
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

  private mapAnnouncementState(estado: string): JobManageItem['estado'] {
    if (estado === 'ACTIVO') return 'Activa';
    if (estado === 'BORRADOR') return 'Borrador';
    if (estado === 'CERRADO') return 'Cerrada';
    return 'Oculta';
  }

  private formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return 'Recién publicada';
    }

    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private resetImageState(vacante: JobManageItem | null) {
    this.previewUrl = vacante?.img || null;
    this.archivoSeleccionado = null;
    this.urlImagenSubida = vacante?.img || '';
    this.fileName = vacante?.img ? 'Imagen de la vacante cargada' : 'Ningun archivo seleccionado';
    this.mostrarEliminarImagen = Boolean(vacante?.img);
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

  ubicacionSeleccionada(direccion: DireccionCompleta) {

    if (
      this.googleMaps.normalizar(direccion.estado || '') !==
      this.googleMaps.normalizar('Guanajuato')
    ) {
      this.mostrarModal(
        'La ubicación debe estar dentro del estado de Guanajuato.'
      );
      return;
    }

    this.form.patchValue({
      estado: direccion.estado,
      ciudad: direccion.ciudad,
      colonia: direccion.colonia || '',
      calle: direccion.calle || '',
      numero_exterior: direccion.numero || '',
      codigo_postal: direccion.codigoPostal || '',
      latitud: direccion.latitud,
      longitud: direccion.longitud,
      direccion_formateada: direccion.direccionFormateada

    });

  }
}
