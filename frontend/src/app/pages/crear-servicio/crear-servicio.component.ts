import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-crear-servicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './crear-servicio.component.html',
  styleUrl: './crear-servicio.component.css'
})
export class CrearServicioComponent {
  
  // Inyección de dependencias para el router y el tema oscuro
  private themeService = inject(ThemeService);
  private router = inject(Router);

  // --- LÓGICA DEL TEMA OSCURO ---
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  // --- NAVEGACIÓN ---
  irAlPerfil() {
    this.router.navigate(['/perfil-postulante']);
  }
}