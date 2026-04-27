import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

interface PostulanteProfileFormValue {
  nombre_postulante: string;
  apellido_paterno_postulante: string;
  apellido_materno_postulante: string;
  correo_electronico: string;
  fecha_nacimiento: string;
  sexo: string;
  pais: string;
  estado: string;
  ciudad: string;
  colonia: string;
  calle: string;
  codigo_postal: string;
  telefono: string;
  curp: string;
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
  selector: 'app-perfil-postulante-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  templateUrl: './perfil-postulante-editar.component.html',
  styleUrls: ['./perfil-postulante-editar.component.css']
})
export class PerfilPostulanteEditarComponent implements OnInit {

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
    curp: '',
    descripcion: ''
  };

  cargando = true;
  guardando = false;
  error = '';
  exito = '';
  postulanteId = '';
  postulanteNombre = 'Postulante';
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
    { id: 1, title: 'Perfil personal', message: 'Recuerda guardar tus cambios antes de salir.', time: 'Ahora', read: false }
  ];

  readonly perfilForm = this.fb.group({
    nombre_postulante: ['', [Validators.required, Validators.maxLength(100)]],
    apellido_paterno_postulante: ['', [Validators.required, Validators.maxLength(100)]],
    apellido_materno_postulante: ['', [Validators.required, Validators.maxLength(100)]],
    correo_electronico: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    fecha_nacimiento: ['', [Validators.required]],
    sexo: ['', [Validators.required]],
    pais: ['', [Validators.required, Validators.maxLength(100)]],
    estado: ['', [Validators.required, Validators.maxLength(100)]],
    ciudad: ['', [Validators.required, Validators.maxLength(100)]],
    colonia: ['', [Validators.required, Validators.maxLength(100)]],
    calle: ['', [Validators.required, Validators.maxLength(150)]],
    codigo_postal: ['', [Validators.required, Validators.maxLength(10)]],
    telefono: ['', [Validators.required, Validators.maxLength(20)]],
    curp: [{ value: '', disabled: false }, [Validators.required, Validators.maxLength(18)]],
    rfc: [{ value: '', disabled: false }, [Validators.required, Validators.maxLength(13)]],
    descripcion: ['', [Validators.maxLength(500)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly themeService: ThemeService,
    private readonly authApi: AuthService
  ) { }

  ngOnInit(): void {
    const usuarioRaw = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');

    if (!usuarioRaw) {
      this.error = 'No hay sesión activa para editar el perfil.';
      this.cargando = false;
      return;
    }

    const usuario = JSON.parse(usuarioRaw);
    if (usuario.rol !== 'postulante' || !usuario.id) {
      this.error = 'Solo un postulante con sesión activa puede editar este perfil.';
      this.cargando = false;
      return;
    }

    this.postulanteId = usuario.id;
    this.postulanteNombre = usuario.nombre || this.postulanteNombre;
    this.checkMobile();

    // Cargar sepomex primero, luego el perfil para que las colonias se precarguen
    this.api.getSepomex().subscribe(data => {
      this.sepomex = data;
      this.cargarPerfil();
    });
  }

  cargarPerfil() {
    this.cargando = true;
    this.api.getMiPerfil().subscribe({
      next: (perfil: any) => {

        let fechaFormateada = '';

        if (perfil.fecha_nacimiento) {
          const fecha = new Date(perfil.fecha_nacimiento);
          fechaFormateada = fecha.toISOString().split('T')[0]
        }
        this.postulanteNombre = perfil.nombre_postulante || this.postulanteNombre;
        this.perfilForm.patchValue({
          nombre_postulante: perfil.nombre_postulante || '',
          apellido_paterno_postulante: perfil.apellido_paterno_postulante || '',
          apellido_materno_postulante: perfil.apellido_materno_postulante || '',
          correo_electronico: perfil.correo_electronico || '',
          fecha_nacimiento: fechaFormateada || '',
          sexo: perfil.sexo || '',
          pais: perfil.pais || '',
          estado: perfil.estado || '',
          ciudad: perfil.ciudad || '',
          colonia: perfil.colonia || '',
          calle: perfil.calle || '',
          codigo_postal: perfil.codigo_postal || '',
          telefono: perfil.telefono || '',
          curp: perfil.curp || '',
          rfc: perfil.rfc || '',
          descripcion: perfil.descripcion || ''
        });

        // Precargar colonias si ya tiene CP registrado
        if (perfil.codigo_postal) {
          const resultados = this.sepomex.filter(r => r.cp === perfil.codigo_postal);
          if (resultados.length > 0) {
            this.colonias = resultados.map((r: any) => r.colonia);
          }
        }

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
      this.exito = 'Foto de perfil subida correctamente.';
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

    // Validamos el formulario reactivo
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.error = 'Completa correctamente los campos obligatorios.';
      return;
    }

    this.guardando = true;

    // Manejo de imagen
    if (this.archivoSeleccionado && !this.urlImagenSubida) {
      try {
        await this.subirImagen();
      } catch {
        this.guardando = false;
        this.error = 'Error al subir la imagen.';
        return;
      }
    }

    // EL PAYLOAD: Aquí es donde se resuelve el error 500
    // getRawValue() obtiene TODO (incluyendo los campos bloqueados como CURP/RFC)
    const payload = {
      ...this.perfilForm.getRawValue(),
      foto_perfil: this.urlImagenSubida || null
    };

    this.api.actualizarMiPerfil(payload).subscribe({
      next: (response) => {
        this.exito = 'Perfil actualizado correctamente. Redirigiendo...';
        this.guardando = false;
        setTimeout(() => this.router.navigate(['/perfil-postulante']), 1200);
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error detallado del servidor:', err);
        // Si el error persiste, el problema es que el backend espera un nombre de columna distinto
        this.error = err.error?.message || 'Error interno del servidor al actualizar.';
      }
    });
  }

  volverPerfil() { this.router.navigate(['/perfil-postulante']); }
  buscarEmpleos() { this.router.navigate(['/buscar-empleos']); }
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

  campoInvalido(nombre: keyof PostulanteProfileFormValue): boolean {
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
    try {
      this.isMobile = window.innerWidth <= 768;
    } catch {
      this.isMobile = false;
    }
  }

  // --- CODIGO POSTAL ---

  hoy = new Date().toISOString().split('T')[0];
  sepomex: any[] = [];
  colonias: string[] = [];

  // --- CONTROL DE MODALES ---
  modalMensaje = '';

  // --- MODAL DE ERROR ---
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

  // --- MODAL DE ÉXITO ---
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
    this.router.navigate(['/job-preferences']);
  }

  // --- BUSCAR CP ---
  buscarCP() {
    const cp = this.perfilForm.get('codigo_postal')?.value?.trim();
    if (!cp) return;

    const resultados = this.sepomex.filter(r => r.cp === cp);

    if (resultados.length > 0) {
      this.perfilForm.patchValue({
        estado: resultados[0].estado,
        ciudad: resultados[0].ciudad,
        colonia: resultados[0].colonia
      });
      this.colonias = resultados.map(r => r.colonia);
    } else {
      this.perfilForm.patchValue({
        estado: '',
        ciudad: '',
        colonia: ''
      });
      this.colonias = [];
      this.mostrarModal('Código postal no encontrado');
    }
  }

}