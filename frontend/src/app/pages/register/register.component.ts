import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {

  form = {
    nombre_postulante: '',
    apellido_paterno_postulante: '',
    apellido_materno_postulante: '',
    correo_electronico: '',
    contrasena: '',
    contrasena_verificar: '',
    fecha_nacimiento: '',
    sexo: '',
    pais: 'México',
    estado: '',
    ciudad: '',
    colonia: '',
    calle: '',
    codigo_postal: '',
    telefono: '',
    rfc: '',
    curp: ''
  };
  
  esMayorDeEdad(fecha: string): boolean {
    if (!fecha) return false;

    const hoy = new Date();
    const nacimiento = new Date(fecha);

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() -nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return edad >= 18;
  }

  mostrarPassword = false;
  mostrarPassword2 = false;

  hoy = new Date().toISOString().split('T')[0];
  sepomex: any[] = [];
  colonias: string[] = [];

  // --- CONTROL DE MODALES ---
  modalMensaje = '';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getSepomex().subscribe(data => this.sepomex = data);
  }

  // --- MODAL DE ERROR ---
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

  // --- MODAL DE ÉXITO ---
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
    this.router.navigate(['/job-preferences']);
  }

  // --- BUSCAR CP ---
  buscarCP() {
    const cp = this.form.codigo_postal.trim();
    const resultados = this.sepomex.filter(r => r.cp === cp);

    if (resultados.length > 0) {
      this.form.estado = resultados[0].estado;
      this.form.ciudad = resultados[0].ciudad;
      this.form.colonia = '';
      this.colonias = resultados.map(r => r.colonia);
    } else {
      this.form.estado = '';
      this.form.ciudad = '';
      this.form.colonia = '';
      this.colonias = [];
      this.mostrarModal('Código postal no encontrado');
    }
  }

  registrar() {
    const { contrasena_verificar, ...datos } = this.form;

    const camposVacios = Object.values(datos).some(v => !v || v.toString().trim() === '');
    if (camposVacios) {
      this.mostrarModal('Todos los campos son obligatorios');
      return;
    }

    if (this.form.contrasena !== this.form.contrasena_verificar) {
      this.mostrarModal('Las contraseñas no coinciden');
      return;
    }

    this.api.registrarPostulante(datos).subscribe({
      next: (res) => {
        this.mostrarModalExito('¡Bienvenido a ChamBee!');
      },
      error: (err: any) => {
        console.error('Error:', err);
        this.mostrarModal('Error al crear la cuenta. Intenta de nuevo.');
      }
    });
  }
}