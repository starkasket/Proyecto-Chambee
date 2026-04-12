import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [], // Ya no ocupas RouterLink aquí si navegamos por TS
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.css'
})
export class CarouselComponent {
  // 1. Recibimos la información del empleo desde el padre
  @Input() job: any; 

  // 2. Inyectamos el enrutador
  private router = inject(Router);

  // 3. Función para navegar
  abrirDetalle() {
    if (this.job && this.job.id) {
      console.log('Navegando desde carrusel al ID:', this.job.id);
      this.router.navigate(['/job', this.job.id]);
    } else {
      console.error('El empleo en el carrusel no tiene ID válido:', this.job);
    }
  }
}