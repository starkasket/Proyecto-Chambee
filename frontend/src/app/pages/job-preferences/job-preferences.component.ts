import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface Categoria {
  nombre: string;
  icono: string;
  descripcion: string;
}

@Component({
  selector: 'app-job-preferences',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-preferences.component.html',
  styleUrl: './job-preferences.component.css'
})
export class JobPreferencesComponent implements OnInit {
  categorias: Categoria[] = [];
  selectedTags: string[] = [];
  guardando = false;
  cargando = true;

  // Modal state
  modalVisible = false;
  modalMensaje = '';

  // Mapa de iconos por categoría
  private iconosMap: Record<string, string> = {
    'Tecnología / TI': '💻',
    'Administración / Oficina': '🗂️',
    'Ventas': '📈',
    'Atención al cliente': '🎧',
    'Marketing / Publicidad': '📣',
    'Diseño': '🎨',
    'Educación / Docencia': '📚',
    'Salud / Medicina': '🏥',
    'Ingeniería': '⚙️',
    'Construcción / Obra': '🏗️',
    'Manufactura / Producción': '🏭',
    'Logística / Transporte': '🚚',
    'Restaurantes / Gastronomía': '🍽️',
    'Turismo / Hotelería': '🏨',
    'Servicios de limpieza': '🧹',
    'Seguridad / Vigilancia': '🔒',
    'Recursos Humanos': '👥',
    'Finanzas / Contabilidad': '💰',
    'Legal / Derecho': '⚖️',
    'Agricultura / Ganadería': '🌾',
    'Servicios técnicos / Mantenimiento': '🔧',
  };

  constructor(
    private router: Router,
    private api: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Si no hay token válido, redirigir al login
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.obtenerCategorias().subscribe({
      next: (cats) => {
        this.categorias = cats.map((c: any) => ({
          nombre: c.nombre,
          icono: this.iconosMap[c.nombre] ?? '🔹',
          descripcion: c.descripcion ?? ''
        }));
        this.cargando = false;
      },
      error: () => {
        this.categorias = [];
        this.cargando = false;
      }
    });

    this.api.obtenerMisEtiquetas().subscribe({
      next: (response) => {
        this.selectedTags = Array.isArray(response?.etiquetas) ? response.etiquetas : [];
      },
      error: () => {
        this.selectedTags = [];
      }
    });
  }

  mostrarModal(mensaje: string) {
    this.modalMensaje = mensaje;
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.modalMensaje = '';
  }

  toggleTag(nombre: string) {
    const index = this.selectedTags.indexOf(nombre);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(nombre);
    }
  }

  isSelected(nombre: string): boolean {
    return this.selectedTags.includes(nombre);
  }

  saveAndContinue() {
    if (this.selectedTags.length === 0) {
      this.mostrarModal('Elige al menos una categoría para personalizar tus recomendaciones.');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.guardando = true;
    this.api.guardarMisEtiquetas(this.selectedTags).subscribe({
      next: () => {
        this.guardando = false;
        this.router.navigate(['/home-user']);
      },
      error: (err: any) => {
        this.guardando = false;
        if (err?.status === 401 || err?.status === 403) {
          this.authService.logout();
          this.router.navigate(['/login']);
        } else {
          this.mostrarModal('No fue posible guardar tus intereses. Intenta nuevamente.');
        }
      }
    });
  }

  skipPreferences() {
    this.router.navigate(['/home-user']);
  }
}
