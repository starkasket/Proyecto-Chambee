import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-job-card',
  standalone: true,
  imports: [],
  templateUrl: './job-card.component.html',
  styleUrl: './job-card.component.css'
})
export class JobCardComponent {
  // 1. Recibimos la información del empleo
  @Input() job: any;

  // 2. Inyectamos el enrutador
  private router = inject(Router);

  // 3. Función para navegar
  abrirDetalle() {
    if (this.job && this.job.id) {
      console.log('Navegando desde tarjeta al ID:', this.job.id);
      this.router.navigate(['/job', this.job.id]);
    } else {
      console.error('El empleo en la tarjeta no tiene ID válido:', this.job);
    }
  }
}