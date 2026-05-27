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
  
  // Variables para la edición
  esEdicion = false;
  idServicioActual = '';

  // Variables que el HTML necesita para funcionar
  modalMensaje = '';
  guardando = false;
  colonias: string[] = []; // Se llena al buscar el CP

  constructor() {
    this.servicioForm = this.fb.group({
      title: ['', Validators.required],
      categoria: ['Plomería'],
      presupuesto: [''],
      description: ['', Validators.required],
      // Campos extra que pide tu HTML
      codigo_postal: [''],
      estado: [''],
      ciudad: [''],
      colonia: [''],
      calle: ['']
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.esEdicion = true;
        this.idServicioActual = id;
        this.cargarDatosDelServicio(id);
      }
    });
  }

  cargarDatosDelServicio(id: string) {
    const usuario = this.api.getUsuario();
    if (usuario && usuario.id) {
      this.api.obtenerMisServicios(String(usuario.id)).subscribe({
        next: (misServicios: any[]) => {
          const servicioAModificar = misServicios.find(s => (s.id_servicio || s.id) === id);
          if (servicioAModificar) {
            this.servicioForm.patchValue({
              title: servicioAModificar.title,
              categoria: servicioAModificar.categoria || 'Plomería',
              presupuesto: servicioAModificar.presupuesto || '',
              description: servicioAModificar.description,
              codigo_postal: servicioAModificar.codigo_postal || '',
              estado: servicioAModificar.estado || '',
              ciudad: servicioAModificar.ciudad || '',
              colonia: servicioAModificar.colonia || '',
              calle: servicioAModificar.calle || ''
            });
          }
        }
      });
    }
  }

  // Ahora con alertas para saber exactamente qué pasa
  publicar(esBorrador: boolean = false) {
    if (this.servicioForm.valid) {
      this.guardando = true; // Activa el spinner
      
      const form = this.servicioForm.value;
      // Juntamos los datos para mandarlos como "ubicacion" al backend
      const ubicacionString = `${form.colonia || ''}, ${form.ciudad || ''}, ${form.estado || ''}`;

      const payload = {
        ...form,
        ubicacion: ubicacionString,
        esBorrador: esBorrador
      };

      if (this.esEdicion) {
        this.serviciosService.actualizarServicio(this.idServicioActual, payload).subscribe({
          next: () => {
            this.guardando = false;
            alert("¡Éxito! El servicio se actualizó en la base de datos.");
            this.router.navigate(['/home-user']);
          },
          error: (err) => {
            this.guardando = false;
            console.error(err);
            alert("Error del servidor: " + err.message);
          }
        });
      } else {
        const usuario = this.api.getUsuario();
        payload.autorId = usuario?.id;

        this.serviciosService.agregarServicio(payload).subscribe({
          next: () => {
            this.guardando = false;
            alert("¡Éxito! El servicio se creó nuevo.");
            this.router.navigate(['/home-user']);
          },
          error: (err) => {
            this.guardando = false;
            console.error(err);
            alert("Error del servidor al crear: " + err.message);
          }
        });
      }
      
    } else {
      Object.keys(this.servicioForm.controls).forEach(key => {
        const control = this.servicioForm.get(key);
        if (control) control.markAsTouched();
      });
      alert('¡El formulario es inválido! Revisa que no te falte el título o la descripción.');
    }
  }

  // --- FUNCIONES EXTRA QUE PIDE EL HTML --- //

  campoInvalido(campo: string): boolean {
    const control = this.servicioForm.get(campo);
    return control ? (control.invalid && (control.touched || control.dirty)) : false;
  }

  buscarCP() {
    const cp = this.servicioForm.get('codigo_postal')?.value;
    if (cp && cp.length === 5) {
      this.servicioForm.patchValue({ estado: 'Guanajuato', ciudad: 'Guanajuato' });
      this.colonias = ['Centro', 'San Javier', 'Marfil'];
    }
  }

  volverPanel() {
    this.router.navigate(['/home-user']);
  }

  cerrarModal() {
    const modal = document.getElementById('modalError');
    if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; }
  }

  cerrarModalExito() {
    const modal = document.getElementById('modalExito');
    if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; }
    this.router.navigate(['/home-user']);
  }

  mostrarModalError() {
    const modal = document.getElementById('modalError');
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