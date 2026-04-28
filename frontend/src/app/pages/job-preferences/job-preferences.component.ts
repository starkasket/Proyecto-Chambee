import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-job-preferences',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-preferences.component.html',
  styleUrl: './job-preferences.component.css'
})
export class JobPreferencesComponent implements OnInit {
  tags: string[] = [];
  modalMensaje = '';
  selectedTags: string[] = [];
  guardando = false;

  constructor(
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.api.obtenerCategorias().subscribe({
      next: (categorias) => {
        this.tags = categorias.map((categoria) => categoria.nombre);
      },
      error: () => {
        this.tags = [];
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

  toggleTag(tag: string) {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
  }

  saveAndContinue() {
    if (this.selectedTags.length === 0) {
      this.mostrarModal('Elige al menos una etiqueta para personalizar tus recomendaciones.');
      return;
    }

    this.guardando = true;
    this.api.guardarMisEtiquetas(this.selectedTags).subscribe({
      next: () => {
        this.guardando = false;
        this.router.navigate(['/home-user']);
      },
      error: () => {
        this.guardando = false;
        this.mostrarModal('No fue posible guardar tus intereses. Intenta nuevamente.');
      }
    });
  }

  skipPreferences() {
    this.router.navigate(['/home-user']);
  }
}
