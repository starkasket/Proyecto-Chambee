import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { ServiciosService } from '../../services/servicios.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-crear-servicio',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './crear-servicio.component.html',
  styleUrl: './crear-servicio.component.css'
})
export class CrearServicioComponent implements OnInit {
  
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private serviciosService = inject(ServiciosService);
  private api = inject(ApiService);

  servicioForm: FormGroup;
  
  foto_perfil = ''; 
  previewUrl: string | null = null;
  archivoSeleccionado: File | null = null;
  fileName = 'Ningún archivo seleccionado';
  subiendoImagen = false;
  urlImagenSubida = '';
  mostrarEliminar = false;

  // Variables para la edición
  esEdicion = false;
  idServicioActual = '';
  titulo = '';
  ending = '';
  // Variables que el HTML necesita para funcionar
  modalMensaje = '';
  guardando = false;
  sepomex: any[] = [];
  colonias: string[] = []; // Se llena al buscar el CP

  constructor() {
    this.servicioForm = this.fb.group({
      title: ['', Validators.required],
      categoria: ['Plomería'],
      presupuesto: [''],
      description: ['', Validators.required],
      cobertura: ['Colonia'], 
      disponibilidad: ['Entre semana'],
      codigo_postal: ['', [Validators.required, Validators.maxLength(5)]],
      estado: ['', Validators.required],
      ciudad: ['', Validators.required],
      colonia: ['', Validators.required],
      calle: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Cargar sepomex primero para que las colonias se precarguen al editar
    this.api.getSepomex().subscribe({
      next: (data) => {
        this.sepomex = data;
        
        this.route.paramMap.subscribe(params => {
          const id = params.get('id');
          if (id) {
            this.esEdicion = true;
            this.idServicioActual = id;
            this.titulo = 'Editar servicio';
            this.ending = 'Guardar cambios';
            this.cargarDatosDelServicio(id);
          } else {
            this.titulo = 'Crear nuevo servicio';
            this.ending = 'Guardar y publicar';
          }
        });
      },
      error: (err) => {
        console.error('Error al cargar sepomex:', err);
      }
    });

    const usuario = this.api.getUsuario();
    if (usuario?.id) {
      // Cargar perfil
      this.api.getMiPerfil().subscribe({
        next: (perfil: any) => {
          this.foto_perfil = perfil?.foto_perfil || '';
        },
        error: () => {
          console.log("Ocurrió un error");
        }
      });
    }
  }

  cargarDatosDelServicio(id: string) {
    const usuario = this.api.getUsuario();
    if (usuario && usuario.id) {
      this.api.obtenerMisServicios(String(usuario.id)).subscribe({
        next: (misServicios: any[]) => {
          const servicioAModificar = misServicios.find(s => (s.id_servicio || s.id) === id);
          if (servicioAModificar) {
            // Precargar colonias si ya tiene CP registrado
            const cp = servicioAModificar.codigo_postal || '';
            if (cp) {
              const resultados = this.sepomex.filter(r => String(r.cp).trim() === String(cp).trim());
              if (resultados.length > 0) {
                this.colonias = resultados.map((r: any) => r.colonia);
              } else {
                this.colonias = [];
              }
            }

            this.servicioForm.patchValue({
              title: servicioAModificar.title,
              categoria: servicioAModificar.categoria || 'Plomería',
              presupuesto: servicioAModificar.presupuesto || '',
              description: servicioAModificar.description,
              cobertura: servicioAModificar.cobertura || 'Colonia',
              disponibilidad: servicioAModificar.disponibilidad || 'Disponible entre semana',
              codigo_postal: cp,
              estado: servicioAModificar.estado || '',
              ciudad: servicioAModificar.ciudad || '',
              colonia: servicioAModificar.colonia || '',
              calle: servicioAModificar.calle || ''
            });

            if (servicioAModificar.img) {
              this.previewUrl = servicioAModificar.img;
              this.urlImagenSubida = servicioAModificar.img;
              this.fileName = 'Imagen del servicio cargada';
              this.mostrarEliminar = true;
            }
          }
        }
      });
    }
  }

  // Ahora con alertas para saber exactamente qué pasa
  async publicar(esBorrador: boolean = false) {
    if (!this.servicioForm.valid) {
      Object.keys(this.servicioForm.controls).forEach(key => {
        const control = this.servicioForm.get(key);
        if (control) control.markAsTouched();
      });
      this.mostrarModalError('¡El formulario es inválido! Revisa que no te falte el título, la descripción o los datos de dirección.');
      return;
    }

    this.guardando = true;

    try {
      if (this.archivoSeleccionado && !this.urlImagenSubida) {
        await this.subirImagen();
      }

      const form = this.servicioForm.value;
      const ubicacionString = `${form.colonia || ''}, ${form.ciudad || ''}, ${form.estado || ''}`;

      const payload = {
        ...form,
        ubicacion: ubicacionString,
        esBorrador: esBorrador,
        img: this.urlImagenSubida || null
      };

      if (this.esEdicion) {
        this.serviciosService.actualizarServicio(this.idServicioActual, payload).subscribe({
          next: () => {
            this.guardando = false;
            this.mostrarModalExito('El servicio se actualizó correctamente.');
          },
          error: (err) => {
            this.guardando = false;
            console.error(err);
            this.mostrarModalError('Error del servidor: ' + err.message);
          }
        });
      } else {
        const usuario = this.api.getUsuario();
        payload.autorId = usuario?.id;

        this.serviciosService.agregarServicio(payload).subscribe({
          next: () => {
            this.guardando = false;
            if (esBorrador == true) {
              this.mostrarModalExito('Se guardó tu borrador correctamente.');
            } else {
              this.mostrarModalExito('El servicio se creó correctamente.');
            }
          },
          error: (err) => {
            this.guardando = false;
            console.error(err);
            this.mostrarModalError('Error del servidor al crear: ' + err.message);
          }
        });
      }
    } catch (err: any) {
      this.guardando = false;
      this.mostrarModalError(err?.message || 'Error al subir la imagen. Intenta de nuevo.');
    }
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const archivo = input.files[0];

    if (archivo.size > 2 * 1024 * 1024) {
      this.mostrarModalError('La imagen no puede superar los 2 MB.');
      return;
    }

    this.archivoSeleccionado = archivo;
    this.urlImagenSubida = '';
    this.mostrarEliminar = false;
    this.fileName = archivo.name.length > 30
      ? archivo.name.substring(0, 27) + '...'
      : archivo.name;

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
        throw new Error('La respuesta de la imagen no fue válida.');
      }

      this.urlImagenSubida = data.secure_url;
      this.mostrarEliminar = true;
      return this.urlImagenSubida;
    } finally {
      this.subiendoImagen = false;
    }
  }

  async subirImagenManual(): Promise<void> {
    try {
      await this.subirImagen();
    } catch (err: any) {
      this.mostrarModalError(err?.message || 'Error al subir la imagen. Intenta de nuevo.');
    }
  }

  eliminarImagen(): void {
    this.previewUrl = null;
    this.archivoSeleccionado = null;
    this.fileName = 'Ningún archivo seleccionado';
    this.urlImagenSubida = '';
    this.mostrarEliminar = false;
  }

  // --- FUNCIONES EXTRA QUE PIDE EL HTML --- //

  campoInvalido(campo: string): boolean {
    const control = this.servicioForm.get(campo);
    return control ? (control.invalid && (control.touched || control.dirty)) : false;
  }

  buscarCP() {
    const cp = this.servicioForm.get('codigo_postal')?.value?.trim();
    if (!cp) return;

    const resultados = this.sepomex.filter(r => String(r.cp).trim() === String(cp));

    if (resultados.length > 0) {
      this.servicioForm.patchValue({
        estado: resultados[0].estado,
        ciudad: resultados[0].ciudad,
        colonia: resultados[0].colonia
      });
      this.colonias = resultados.map(r => r.colonia);
    } else {
      this.servicioForm.patchValue({
        estado: '',
        ciudad: '',
        colonia: ''
      });
      this.colonias = [];
      this.mostrarModalError('Código postal no encontrado');
    }
  }

  volverPanel() {
    this.router.navigate(['/home-user']);
  }

  cerrarModal() {
    const modal = document.getElementById('modalAlerta');
    if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; }
  }

  cerrarModalExito() {
    const modal = document.getElementById('modalSaludo');
    if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; }
    this.router.navigate(['/home-user']);
  }

  mostrarModalError(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalAlerta');
    if (modal) { modal.classList.add('show'); modal.style.display = 'flex'; }
  }

  mostrarModalExito(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalSaludo');
    if (modal) { modal.classList.add('show'); modal.style.display = 'flex'; }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  irAlPerfil() {
    this.router.navigate(['/perfil-postulante']);
  }
}