import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';

interface EmployerProfileFormValue {
  nombre_empresa: string;
  correo_electronico: string;
  pais: string;
  estado: string;
  ciudad: string;
  colonia: string;
  calle: string;
  codigo_postal: string;
  telefono: string;
  rfc: string;
  descripcion: string;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-employer-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './employer-profile-edit.component.html',
  styleUrl: './employer-profile-edit.component.css'
})
export class EmployerProfileEditComponent implements OnInit {
  cargando = true;
  guardando = false;
  error = '';
  exito = '';
  employerId = '';
  empresaNombre = 'Empresa';
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = true;
  isMobile = false;

  notifications: NotificationItem[] = [
    { id: 1, title: 'Perfil de empresa', message: 'Recuerda guardar tus cambios antes de salir.', time: 'Ahora', read: false },
    { id: 2, title: 'Consejo', message: 'Mantener tu informacion actualizada mejora la confianza de los candidatos.', time: 'Hace 20 min', read: true }
  ];

  // Este formulario refleja los campos reales de la tabla `empleador`.
  readonly perfilForm = this.fb.group({
    nombre_empresa: ['', [Validators.required, Validators.maxLength(150)]],
    correo_electronico: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    pais: ['', [Validators.required, Validators.maxLength(100)]],
    estado: ['', [Validators.required, Validators.maxLength(100)]],
    ciudad: ['', [Validators.required, Validators.maxLength(100)]],
    colonia: ['', [Validators.required, Validators.maxLength(100)]],
    calle: ['', [Validators.required, Validators.maxLength(150)]],
    codigo_postal: ['', [Validators.required, Validators.maxLength(10)]],
    telefono: ['', [Validators.required, Validators.maxLength(20)]],
    rfc: ['', [Validators.required, Validators.maxLength(20)]],
    descripcion: ['', [Validators.maxLength(500)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const usuarioRaw = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');

    if (!usuarioRaw) {
      this.error = 'No hay sesion activa para editar el perfil.';
      this.cargando = false;
      return;
    }

    const usuario = JSON.parse(usuarioRaw);
    if (usuario.rol !== 'empleador' || !usuario.id) {
      this.error = 'Solo un empleador con sesion activa puede editar este perfil.';
      this.cargando = false;
      return;
    }

    this.employerId = usuario.id;
    this.empresaNombre = usuario.nombre || this.empresaNombre;
    this.checkMobile();
    this.cargarPerfil();
  }

  cargarPerfil() {
    this.cargando = true;
    this.api.obtenerPerfilEmpleador(this.employerId).subscribe({
      next: (perfil) => {
        this.empresaNombre = perfil.nombre_empresa || this.empresaNombre;
        this.perfilForm.patchValue({
          nombre_empresa: perfil.nombre_empresa || '',
          correo_electronico: perfil.correo_electronico || '',
          pais: perfil.pais || '',
          estado: perfil.estado || '',
          ciudad: perfil.ciudad || '',
          colonia: perfil.colonia || '',
          calle: perfil.calle || '',
          codigo_postal: perfil.codigo_postal || '',
          telefono: perfil.telefono || '',
          rfc: perfil.rfc || '',
          descripcion: perfil.descripcion || ''
        });
        this.cargando = false;
      },
      error: () => {
        this.error = 'No fue posible cargar los datos del perfil.';
        this.cargando = false;
      }
    });
  }

  guardarCambios() {
    this.error = '';
    this.exito = '';

    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.error = 'Completa correctamente los campos obligatorios.';
      return;
    }

    this.guardando = true;
    const payload = this.perfilForm.getRawValue() as EmployerProfileFormValue;

    this.api.actualizarPerfilEmpleador(this.employerId, payload).subscribe({
      next: (response) => {
        const perfilActualizado = response.perfil;

        // Se actualiza el cache local para que home y perfil reflejen los cambios al instante.
        localStorage.setItem('perfilEmpleador', JSON.stringify(perfilActualizado));

        const usuarioRaw = localStorage.getItem('usuario');
        if (usuarioRaw) {
          const usuario = JSON.parse(usuarioRaw);
          localStorage.setItem('usuario', JSON.stringify({
            ...usuario,
            nombre: perfilActualizado.nombre_empresa,
            correo: perfilActualizado.correo_electronico
          }));
        }

        this.guardando = false;
        this.exito = 'Perfil actualizado correctamente.';
      },
      error: () => {
        this.guardando = false;
        this.error = 'No se pudieron guardar los cambios del perfil.';
      }
    });
  }

  volverPerfil() {
    this.router.navigate(['/perfil']);
  }

  crearOferta() {
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
    localStorage.removeItem('usuario');
    localStorage.removeItem('perfilEmpleador');
    this.router.navigate(['/']);
  }

  campoInvalido(nombre: keyof EmployerProfileFormValue): boolean {
    const control = this.perfilForm.get(nombre);
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
