import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

interface JobManageItem {
  id: string;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  fecha: string;
  candidatos: number;
  estado: 'Activa' | 'Borrador' | 'Oculta';
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
  codigo_postal: string;
  salario: number;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-employer-jobs-manage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
  hasUnreadNotifications = true;
  isMobile = false;
  categoriasDisponibles: string[] = [];
  colonias: string[] = [];
  sepomex: any[] = [];
  originalFormValue: ReturnType<EmployerJobsManageComponent['form']['getRawValue']> | null = null;
  modalMensajePendiente: string = '';

  notifications: NotificationItem[] = [
    { id: 1, title: 'Tip de publicación', message: 'Mantén tus vacantes actualizadas para recibir mejores candidatos.', time: 'Hace 12 min', read: false },
    { id: 2, title: 'Chambee', message: 'Puedes mover una vacante a borrador si aún no está lista.', time: 'Hace 1 hora', read: true }
  ];

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
    codigo_postal: ['', [Validators.required, Validators.maxLength(10)]],
    salario: [null as number | null, [Validators.required, Validators.min(1)]],
    modalidad: ['Presencial', [Validators.required]],
    etiquetas: this.fb.nonNullable.control<string[]>([], [Validators.required])
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private readonly authApi: AuthService
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

    this.cargarVacantes();
    this.checkMobile();
  }

  cargarVacantes() {
    this.cargando = true;
    this.api.obtenerAnunciosEmpleador(this.employerId).subscribe({
      next: (anuncios) => {
        this.vacantes = anuncios.map((anuncio) => ({
          id: anuncio.id_anuncio,
          titulo: anuncio.titulo,
          descripcion: anuncio.descripcion,
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
          codigo_postal: anuncio.codigo_postal || '',
          salario: Number(anuncio.salario) || 0
        }));

        if (this.vacantes.length) {
          const id = this.vacanteSeleccionadaId || this.vacantes[0].id;
          this.seleccionarVacante(id);
        } else {
          this.vacanteSeleccionadaId = '';
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
            codigo_postal: '',
            salario: null,
            modalidad: 'Presencial',
            etiquetas: []
          });
          this.originalFormValue = this.form.getRawValue();
        }

        this.cargando = false;

        // Si hay un mensaje pendiente, mostrarlo después de cargar
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

    // Asegurar que etiquetas siempre tiene un array válido
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
      codigo_postal: vacante.codigo_postal || '',
      salario: vacante.salario || null,
      modalidad: vacante.modalidad || 'Presencial',
      etiquetas: etiquetas
    });
    this.originalFormValue = this.form.getRawValue();
    this.form.markAsPristine();

    this.buscarCP(false);
  }

  guardarCambios() {
    if (!this.vacanteSeleccionadaId) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarModal('Completa todos los campos requeridos antes de guardar.');
      return;
    }

    if (this.guardando) return; // Prevenir múltiples clics

    this.guardando = true;
    this.cerrarModal();
    this.modalMensajePendiente = 'La vacante se actualizó correctamente.';

    this.api.actualizarAnuncioEmpleador(this.employerId, this.vacanteSeleccionadaId, this.form.getRawValue()).subscribe({
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

    if (this.actualizandoEstado) return; // Prevenir múltiples clics

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

  toggleNotifications(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach((notification) => notification.read = true);
    }
    this.menuOpen = false;
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
