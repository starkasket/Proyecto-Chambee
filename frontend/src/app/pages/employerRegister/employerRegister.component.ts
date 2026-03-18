import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-employer-register',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './employerRegister.component.html',
  styleUrl: './employerRegister.component.css'
})
export class EmployerRegisterComponent {

  form = {
    nombre_empresa: '',
    correo_electronico: '',
    contrasena: '',
    contrasena_verificar: '',
    pais: 'México',
    estado: '',
    ciudad: '',
    colonia: '',
    calle: '',
    codigo_postal: '',
    telefono: '',
    rfc: '',
    descripcion: ''
  };

  colonias: string[] = [];
  buscandoCP = false;

  // --- CONTROL DE MODALES ---
  modalMensaje = '';
  modalMensajeExito = '';

  constructor(private api: ApiService, private router: Router, private http: HttpClient) {}

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
    this.modalMensajeExito = mensaje;
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
    // Redirige a las etiquetas después de registrar la empresa
    this.router.navigate(['/job-preferences']);
  }

  // --- BUSCAR CÓDIGO POSTAL ---
  buscarCP() {
    const cp = this.form.codigo_postal.trim();
    if (cp.length !== 5) return;

    this.buscandoCP = true;
    this.http.get<any[]>('assets/sepomex_gto.json').subscribe({
      next: (data) => {
        const resultados = data.filter(r => r.cp === cp);
        if (resultados.length > 0) {
          this.form.estado = resultados[0].estado;
          this.form.ciudad = resultados[0].ciudad || resultados[0].municipio;
          this.form.colonia = '';
          this.colonias = resultados.map(r => r.colonia);
        } else {
          this.mostrarModal('Código postal no encontrado');
          this.form.estado = '';
          this.form.ciudad = '';
          this.colonias = [];
        }
        this.buscandoCP = false;
      },
      error: () => {
        this.mostrarModal('Error al cargar los códigos postales');
        this.buscandoCP = false;
      }
    });
  }

  registrar() {
    if (this.form.contrasena !== this.form.contrasena_verificar) {
      this.mostrarModal('Las contraseñas no coinciden');
      return;
    }

    const { contrasena_verificar, ...datos } = this.form;

    // Validar campos obligatorios
    const camposVacios = Object.values(datos).some(valor => !valor || valor.toString().trim() === '');
    if (camposVacios) {
      this.mostrarModal('Todos los campos son obligatorios');
      return;
    }

    this.api.registrarEmpleador(datos).subscribe({
      next: (res) => {
        this.mostrarModalExito(`¡Tu empresa ya forma parte de ChamBee!`);
      },
      error: (err) => {
        console.error('Error:', err);
        this.mostrarModal('Error al crear la cuenta. Intenta de nuevo.');
      }
    });
  }
}