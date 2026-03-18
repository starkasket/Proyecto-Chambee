import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


@Component({
  selector: 'app-job-preferences',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-preferences.component.html',
  styleUrl: './job-preferences.component.css'
})
export class JobPreferencesComponent {
  tags: string[] = [
  'Tecnología / TI',
  'Administración / Oficina',
  'Ventas',
  'Atención al cliente',
  'Marketing / Publicidad',
  'Diseño',
  'Educación / Docencia',
  'Salud / Medicina',
  'Ingeniería',
  'Construcción / Obra',
  'Manufactura / Producción',
  'Logística / Transporte',
  'Restaurantes / Gastronomía',
  'Turismo / Hotelería',
  'Servicios de limpieza',
  'Seguridad / Vigilancia',
  'Recursos Humanos',
  'Finanzas / Contabilidad',
  'Legal / Derecho',
  'Agricultura / Ganadería',
  'Servicios técnicos / Mantenimiento'
];
  modalMensaje = '';

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


  // Arreglo que guardará lo que el usuario seleccione
  selectedTags: string[] = [];

  constructor(private router: Router) {}

  // Función que se ejecuta al hacer clic en una etiqueta
  toggleTag(tag: string) {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      // Si la etiqueta ya estaba seleccionada, la quitamos
      this.selectedTags.splice(index, 1);
    } else {
      // Si no estaba, la agregamos
      this.selectedTags.push(tag);
    }
  }

  // Función para el botón final de guardar
  
saveAndContinue() {
  if (this.selectedTags.length === 0) {
    this.mostrarModal('¡Elige lo que te apasiona para encontrar tu Chamba ideal!');
    return;
  }
  console.log('Etiquetas guardadas:', this.selectedTags);
  this.router.navigate(['/home-user']);

    
    console.log('Etiquetas guardadas:', this.selectedTags);
    // Redirigimos a la página de inicio
    this.router.navigate(['/home-user']);
  }

  // Función para omitir este paso
  skipPreferences() {
    console.log('El usuario decidió omitir la selección de etiquetas.');
    // Lo mandamos directo al home sin guardar nada
    this.router.navigate(['/home-user']);
  }
}