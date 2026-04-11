import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

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

  previewUrl: string | null = null;        
  archivoSeleccionado: File | null = null; 
  fileName = 'Ningún archivo seleccionado';
  subiendoImagen = false;                  
  urlImagenSubida = '';           
  mostrarEliminar = false;                 

  notifications: NotificationItem[] = [
    { id: 1, title: 'Perfil de empresa', message: 'Recuerda guardar tus cambios antes de salir.', time: 'Ahora', read: false },
    { id: 2, title: 'Consejo', message: 'Mantener tu informacion actualizada mejora la confianza de los candidatos.', time: 'Hace 20 min', read: true }
  ];

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
    private readonly themeService: ThemeService,
    private readonly authApi: AuthService
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

        if (perfil.foto_perfil) {
          this.previewUrl = perfil.foto_perfil;
          this.urlImagenSubida = perfil.foto_perfil;
          this.mostrarEliminar = true;
        }
        

        this.cargando = false;
      },
      error: () => {
        this.error = 'No fue posible cargar los datos del perfil.';
        this.cargando = false;
      }
    });
  }

onArchivoSeleccionado(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const archivo = input.files[0];

  if (archivo.size > 2 * 1024 * 1024) {
    this.error = 'La imagen no puede superar los 2 MB.';
    return;
  }

  this.archivoSeleccionado = archivo;
  this.urlImagenSubida = '';           
  this.fileName = archivo.name.length > 30
    ? archivo.name.substring(0, 27) + '...'
    : archivo.name;
  this.error = '';

  const reader = new FileReader();
  reader.onload = (e) => {
    this.previewUrl = e.target?.result as string;
  };
  reader.readAsDataURL(archivo);
}
  async subirImagen(): Promise<void> {
    if (!this.archivoSeleccionado) return;

    this.subiendoImagen = true;
    this.urlImagenSubida = '';
    this.error = '';

    const formData = new FormData();
    formData.append('file', this.archivoSeleccionado);
    formData.append('upload_preset', 'chambee_upload'); 

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dqq9oeo4e/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      this.urlImagenSubida = data.secure_url;
      this.mostrarEliminar = true;
      this.exito = 'Logo subido correctamente.';
    } catch {
      this.error = 'Error al subir la imagen. Intenta de nuevo.';
    } finally {
      this.subiendoImagen = false;
    }
  }
  

  eliminarImagen(): void {
    this.previewUrl = null;
    this.archivoSeleccionado = null;
    this.fileName = 'Ningún archivo seleccionado';
    this.urlImagenSubida = '';
    this.mostrarEliminar = false;
    this.exito = '';
  }

  async guardarCambios() {
    this.error = '';
    this.exito = '';

    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.error = 'Completa correctamente los campos obligatorios.';
      return;
    }

    this.guardando = true;

    // Si hay una imagen seleccionada pero no se ha subido, subirla automáticamente
    if (this.archivoSeleccionado && !this.urlImagenSubida) {
      try {
        await this.subirImagen();
      } catch {
        this.guardando = false;
        this.error = 'Error al subir la imagen. Intenta de nuevo.';
        return;
      }
    }

    const payload = {
      ...this.perfilForm.getRawValue() as EmployerProfileFormValue,
      foto_perfil: this.urlImagenSubida || null
    };

    this.api.actualizarPerfilEmpleador(this.employerId, payload).subscribe({
      next: (response) => {
        const perfilActualizado = response.perfil;
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
        this.exito = 'Perfil actualizado correctamente. Redirigiendo...';

        // Navegar al perfil después de un breve momento
        setTimeout(() => {
          this.router.navigate(['/perfil']);
        }, 1200);
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error al guardar perfil:', err);
        this.error = 'No se pudieron guardar los cambios del perfil.';
      }
    });
  }

  volverPerfil() { this.router.navigate(['/perfil']); }
  crearOferta() { this.router.navigate(['/post-job']); }
  toggleTheme() { this.themeService.toggleTheme(); }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  toggleNotifications(event?: Event) {
    if (event) event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);
    }
    this.menuOpen = false;
  }

  toggleMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  logout() {
  this.authApi.logout();
  }

  campoInvalido(nombre: keyof EmployerProfileFormValue): boolean {
    const control = this.perfilForm.get(nombre);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.notificationsOpen) this.notificationsOpen = false;
    if (this.menuOpen) this.menuOpen = false;
  }

  @HostListener('window:resize')
  onResize() { this.checkMobile(); }

  private checkMobile() {
    try { this.isMobile = window.innerWidth <= 768; }
    catch { this.isMobile = false; }
  }
}