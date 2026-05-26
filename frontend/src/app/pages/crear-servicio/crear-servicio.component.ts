import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
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
  private fb = inject(FormBuilder);
  private serviciosService = inject(ServiciosService);
  private api = inject(ApiService);

  servicioForm: FormGroup;
  sepomex: any[] = [];
  colonias: string[] = [];
  guardando = false;
  modalMensaje = '';

  constructor() {
    this.servicioForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(160)]],
      description: ['', [Validators.required, Validators.maxLength(400)]],
      categoria: ['Plomería', [Validators.required]],
      presupuesto: [null as number | null, [Validators.required, Validators.min(1)]],
      modalidad: ['Presencial', [Validators.required]],
      urgencia: ['Normal', [Validators.required]],
      codigo_postal: ['', [Validators.required, Validators.maxLength(10)]],
      estado: ['', [Validators.required, Validators.maxLength(100)]],
      ciudad: ['', [Validators.required, Validators.maxLength(100)]],
      colonia: ['', [Validators.required, Validators.maxLength(100)]],
      calle: ['', [Validators.required, Validators.maxLength(150)]]
    });
  }

  ngOnInit(): void {
    this.api.getSepomex().subscribe({
      next: (data) => {
        this.sepomex = data;
      },
      error: () => {
        this.sepomex = [];
      }
    });
  }

  buscarCP() {
    const cp = this.servicioForm.get('codigo_postal')?.value;

    if (!cp) {
      this.mostrarModal('Ingresa un código postal');
      return;
    }

    const resultados = this.sepomex.filter(r => String(r.cp) === String(cp).trim());

    if (resultados.length > 0) {
      this.servicioForm.patchValue({
        estado: resultados[0].estado,
        ciudad: resultados[0].ciudad
      });
      this.colonias = resultados.map(r => r.colonia);
      if (this.colonias.length > 0) {
        this.servicioForm.patchValue({ colonia: this.colonias[0] });
      }
    } else {
      this.mostrarModal('Código postal no encontrado en Guanajuato');
      this.colonias = [];
      this.servicioForm.patchValue({ estado: '', ciudad: '', colonia: '' });
    }
  }

  publicar(esBorrador: boolean) {
    if (this.servicioForm.valid) {
      this.guardando = true;
      
      const formValue = this.servicioForm.value;
      const ubicacionString = `${formValue.calle}, Col. ${formValue.colonia}, ${formValue.ciudad}, ${formValue.estado}`;

      // Obtener el ID del usuario actual para vincular el servicio
      const usuario = this.api.getUsuario();
      const autorId = usuario?.id ? String(usuario.id) : 'anonimo';

      const nuevoServicio = {
        title: formValue.title,
        description: formValue.description,
        categoria: formValue.categoria,
        presupuesto: formValue.presupuesto ? `$${formValue.presupuesto.toLocaleString()} MXN` : '',
        ubicacion: ubicacionString,
        estado: formValue.estado,
        ciudad: formValue.ciudad,
        colonia: formValue.colonia,
        calle: formValue.calle,
        codigo_postal: formValue.codigo_postal,
        modalidad: formValue.modalidad,
        urgencia: formValue.urgencia,
        esBorrador: esBorrador,
        autorId: autorId,
        fechaCreacion: new Date().toISOString()
      };

   this.api.crearServicio(nuevoServicio).subscribe({
  next: () => {
    this.guardando = false;
    if (esBorrador) {
      this.mostrarModalExito('Tu servicio ha sido guardado como borrador.');
    } else {
      this.mostrarModalExito('¡Tu servicio ha sido publicado con éxito!');
    }
  },
  error: (err) => {
    this.guardando = false;
    this.mostrarModal('Error al guardar el servicio. Intenta de nuevo.');
    console.error(err);
  }
});
    } else {
      this.servicioForm.markAllAsTouched();
      this.mostrarModal('Por favor, completa todos los campos requeridos para continuar.');
    }
  }

  campoInvalido(nombre: string): boolean {
    const control = this.servicioForm.get(nombre);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  volverPanel() {
    this.router.navigate(['/home-user']);
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
    this.router.navigate(['/home-user']);
  }
}