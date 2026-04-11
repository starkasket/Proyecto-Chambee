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
  estado: string;
  ciudad: string;
  colonia: string;
  calle: string;
  codigo_postal: string;
  salario: number;
  modalidad: string;
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

  notifications: NotificationItem[] = [
    { id: 1, title: 'Consejo rapido', message: 'Agrega salario y modalidad para mejorar la conversion.', time: 'Hace 2 min', read: false },
    { id: 2, title: 'Perfil actualizado', message: 'Tu empresa ya puede publicar nuevas ofertas.', time: 'Hace 1 hora', read: true }
  ];

  // Los campos siguen la estructura real de la tabla `anuncios`.
  readonly ofertaForm = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(160)]],
    descripcion: ['', [Validators.required, Validators.maxLength(600)]],
    tipo_anuncio: ['Empleo', [Validators.required]],
    estado: ['', [Validators.required, Validators.maxLength(100)]],
    ciudad: ['', [Validators.required, Validators.maxLength(100)]],
    colonia: ['', [Validators.required, Validators.maxLength(100)]],
    calle: ['', [Validators.required, Validators.maxLength(150)]],
    codigo_postal: ['', [Validators.required, Validators.maxLength(10)]],
    salario: [null as number | null, [Validators.required, Validators.min(1)]],
    modalidad: ['Presencial', [Validators.required]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private readonly authApi: AuthService
  ) {}

  ngOnInit(): void {
    const usuarioRaw = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    const perfilLocalRaw = localStorage.getItem('perfilEmpleador') || sessionStorage.getItem('perfilEmpleador');

    if (!usuarioRaw) {
      this.error = 'No hay sesion activa para crear una oferta laboral.';
      return;
    }

    const usuario = JSON.parse(usuarioRaw);
    if (usuario.rol !== 'empleador' || !usuario.id) {
      this.error = 'Solo un empleador con sesion activa puede crear ofertas laborales.';
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
    } else {
      this.cargarPerfilBase();
    }

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
        this.exito = 'Oferta laboral publicada correctamente.';
        this.ofertaForm.reset({
          titulo: '',
          descripcion: '',
          tipo_anuncio: 'Empleo',
          estado: payload.estado,
          ciudad: payload.ciudad,
          colonia: payload.colonia,
          calle: payload.calle,
          codigo_postal: payload.codigo_postal,
          salario: null,
          modalidad: 'Presencial'
        });
      },
      error: () => {
        this.guardando = false;
        this.error = 'No fue posible crear la oferta laboral.';
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
}
