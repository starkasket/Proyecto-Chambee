import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { ServiciosService } from '../../services/servicios.service';

@Component({
  selector: 'app-crear-servicio',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './crear-servicio.component.html',
  styleUrl: './crear-servicio.component.css'
})
export class CrearServicioComponent {
  
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private serviciosService = inject(ServiciosService);

  servicioForm: FormGroup;

  constructor() {
    // Usamos 'title' y 'description' para que coincidan con la vista del Home
    this.servicioForm = this.fb.group({
      title: ['', Validators.required],
      categoria: ['Plomería'],
      presupuesto: [''],
      ubicacion: [''],
      description: ['', Validators.required]
    });
  }

  publicar() {
    if (this.servicioForm.valid) {
      this.serviciosService.agregarServicio(this.servicioForm.value);
      this.router.navigate(['/home-user']);
    } else {
      // Esta es la parte que le gusta a TypeScript para no marcar error
      Object.keys(this.servicioForm.controls).forEach((key: string) => {
        const control = this.servicioForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
      alert('Por favor, ingresa el nombre del servicio y la descripción.');
    }
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