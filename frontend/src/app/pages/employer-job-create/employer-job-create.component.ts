import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

interface EmployerJobFormValue {
  titulo: string;
  descripcion: string;
  tipo_anuncio: string;
  urgencia: string;
  edad: string;
  educacion: string;
  experiencia: string;
  estado: string;
  ciudad: string;
  colonia: string;
  calle: string;
  codigo_postal: string;
  salario: number;
  modalidad: string;
  etiquetas: string[];
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-employer-job-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './employer-job-create.component.html',
  styleUrl: './employer-job-create.component.css'
})
export class EmployerJobCreateComponent implements OnInit {
  form = {
    nombre_postulante: '',
    apellido_paterno_postulante: '',
    apellido_materno_postulante: '',
    correo_electronico: '',
    contrasena: '',
    contrasena_verificar: '',
    fecha_nacimiento: '',
    sexo: '',
    pais: 'México',
    estado: '',
    ciudad: '',
    colonia: '',
    calle: '',
    codigo_postal: '',
    telefono: '',
    rfc: '',
    curp: ''
  };
  employerId = '';
  empresaNombre = 'Empresa';
  guardando = false;
  cargandoPerfil = false;
  error = '';
  exito = '';
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = true;
  isMobile = false;
  categoriasDisponibles: string[] = [];

  notifications: NotificationItem[] = [
    { id: 1, title: 'Consejo rápido', message: 'Agrega salario, modalidad y etiquetas para mejorar la conversión.', time: 'Hace 2 min', read: false },
    { id: 2, title: 'Perfil actualizado', message: 'Tu empresa ya puede publicar nuevas ofertas.', time: 'Hace 1 hora', read: true }
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
    'Ingenieria',
    'Maestria'
  ];

  readonly opcionesExperiencia = [
    'Sin experiencia',
    'Menos de 1 ano',
    '1 a 2 anos',
    '3 a 5 anos',
    'Más de 5 años'
  ];

  readonly opcionesUrgencia = [
    'Normal',
    'Urgente',
    'Muy urgente'
  ];

  readonly ofertaForm = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(160)]],
    descripcion: ['', [Validators.required, Validators.maxLength(400)]],
    tipo_anuncio: ['Empleo', [Validators.required]],
    urgencia: ['Normal', [Validators.required, Validators.maxLength(30)]],
    edad: ['Sin especificar', [Validators.maxLength(60)]],
    educacion: ['Sin especificar', [Validators.maxLength(80)]],
    experiencia: ['Sin experiencia', [Validators.required, Validators.maxLength(50)]],
    estado: ['', [Validators.required, Validators.maxLength(100)]],
    ciudad: ['', [Validators.required, Validators.maxLength(100)]],
    colonia: ['', [Validators.required, Validators.maxLength(100)]],
    calle: ['', [Validators.required, Validators.maxLength(150)]],
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
    this.api.obtenerCategorias().subscribe({
      next: (categorias) => {
        this.categoriasDisponibles = categorias.map((categoria) => categoria.nombre);
      },
      error: () => {
        this.categoriasDisponibles = [];
      }
    });

    this.api.getSepomex().subscribe(data => {
      this.sepomex = data;

      const usuarioRaw = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
      const perfilLocalRaw = localStorage.getItem('perfilEmpleador') || sessionStorage.getItem('perfilEmpleador');

      if (!usuarioRaw) {
        this.error = 'No hay sesión activa para crear una oferta laboral.';
        return;
      }

      const usuario = JSON.parse(usuarioRaw);
      if (usuario.rol !== 'empleador' || !usuario.id) {
        this.error = 'Solo un empleador con sesión activa puede crear ofertas laborales.';
        return;
      }

      this.employerId = usuario.id;
      this.empresaNombre = usuario.nombre || this.empresaNombre;

      if (perfilLocalRaw) {
        const perfil = JSON.parse(perfilLocalRaw);
        this.empresaNombre = perfil.nombre_empresa || this.empresaNombre;
        this.ofertaForm.patchValue({
          estado: perfil.estado || '',
          ciudad: perfil.ciudad || '',
          colonia: perfil.colonia || '',
          calle: perfil.calle || '',
          codigo_postal: perfil.codigo_postal || ''
        });

        if (perfil.codigo_postal) {
          this.buscarCP();
          this.ofertaForm.patchValue({ colonia: perfil.colonia });
        }
      } else {
        this.cargarPerfilBase();
      }
    });

    this.checkMobile();
  }

  cargarPerfilBase() {
    this.cargandoPerfil = true;
    this.api.obtenerPerfilEmpleador(this.employerId).subscribe({
      next: (perfil) => {
        this.empresaNombre = perfil.nombre_empresa || this.empresaNombre;
        this.ofertaForm.patchValue({
          estado: perfil.estado || '',
          ciudad: perfil.ciudad || '',
          colonia: perfil.colonia || '',
          calle: perfil.calle || '',
          codigo_postal: perfil.codigo_postal || ''
        });
        this.cargandoPerfil = false;
      },
      error: () => {
        this.cargandoPerfil = false;
      }
    });
  }

  publicarOferta() {
    this.error = '';
    this.exito = '';

    if (this.ofertaForm.invalid) {
      this.ofertaForm.markAllAsTouched();
      this.error = 'Completa los campos requeridos para publicar la oferta.';
      return;
    }

    this.guardando = true;
    const payload = this.ofertaForm.getRawValue() as EmployerJobFormValue;

    this.api.crearAnuncioEmpleador(this.employerId, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.ofertaForm.reset({
          titulo: '',
          descripcion: '',
          tipo_anuncio: 'Empleo',
          urgencia: 'Normal',
          edad: 'Sin especificar',
          educacion: 'Sin especificar',
          experiencia: 'Sin experiencia',
          estado: payload.estado,
          ciudad: payload.ciudad,
          colonia: payload.colonia,
          calle: payload.calle,
          codigo_postal: payload.codigo_postal,
          salario: null,
          modalidad: 'Presencial',
          etiquetas: []
        });
        this.mostrarModalExito('Tu oferta laboral fue publicada exitosamente.');
      },
      error: (err) => {
        this.guardando = false;
        this.mostrarModal(err?.error?.detail || err?.error?.error || 'No fue posible crear la oferta laboral.');
      }
    });
  }

  volverPanel() {
    this.router.navigate(['/home-employer']);
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
      this.notifications.forEach((notification) => {
        notification.read = true;
      });
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

  campoInvalido(nombre: keyof EmployerJobFormValue): boolean {
    const control = this.ofertaForm.get(nombre);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  get etiquetasSeleccionadas(): string[] {
    return this.ofertaForm.controls.etiquetas.value;
  }

  toggleEtiqueta(etiqueta: string) {
    const actuales = this.etiquetasSeleccionadas;
    const nuevasEtiquetas = actuales.includes(etiqueta)
      ? actuales.filter((item) => item !== etiqueta)
      : [...actuales, etiqueta];

    this.ofertaForm.controls.etiquetas.setValue(nuevasEtiquetas);
    this.ofertaForm.controls.etiquetas.markAsTouched();
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

  modalMensaje = '';
  sepomex: any[] = [];
  colonias: string[] = [];

  hoy = new Date().toISOString().split('T')[0];

  buscarCP() {
    const cp = this.ofertaForm.get('codigo_postal')?.value;

    if (!cp) {
      this.mostrarModal('Ingresa un código postal');
      return;
    }

    const resultados = this.sepomex.filter(r => String(r.cp) === String(cp).trim());

    if (resultados.length > 0) {
      this.ofertaForm.patchValue({
        estado: resultados[0].estado,
        ciudad: resultados[0].ciudad
      });
      this.colonias = resultados.map(r => r.colonia);
    } else {
      this.mostrarModal('Código postal no encontrado');
      this.colonias = [];
      this.ofertaForm.patchValue({ estado: '', ciudad: '', colonia: '' });
    }
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
    this.router.navigate(['/home-employer']);
  }
}
