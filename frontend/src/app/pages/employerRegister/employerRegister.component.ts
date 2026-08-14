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

  mostrarPassword = false;
  mostrarPassword2 = false;
  colonias: string[] = [];
  buscandoCP = false;

  erroresDuplicados = {
    correo_electronico: false,
    rfc: false,
    nombre_empresa: false
  };

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
    // Redirige a home-employer después de registrar la empresa
    this.router.navigate(['/home-employer']);
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
    // Validaciones campo a campo con mensajes claros
    if (!this.form.nombre_empresa || !this.form.nombre_empresa.trim()) {
      this.mostrarModal('El nombre de la empresa es obligatorio.');
      return;
    }
    if (!this.form.correo_electronico || !this.form.correo_electronico.trim()) {
      this.mostrarModal('El correo electrónico es obligatorio.');
      return;
    }
    if (!this.form.contrasena) {
      this.mostrarModal('La contraseña es obligatoria.');
      return;
    }
    if (!this.form.contrasena_verificar) {
      this.mostrarModal('Debes confirmar tu contraseña.');
      return;
    }
    if (this.form.contrasena !== this.form.contrasena_verificar) {
      this.mostrarModal('Las contraseñas no coinciden.');
      return;
    }
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;
    if (!passRegex.test(this.form.contrasena)) {
      this.mostrarModal('La contraseña debe tener al menos 6 caracteres: una minúscula, una mayúscula, un número y un símbolo.');
      return;
    }
    if (!this.form.telefono || !this.form.telefono.trim()) {
      this.mostrarModal('El teléfono es obligatorio.');
      return;
    }
    if (!this.form.descripcion || !this.form.descripcion.trim()) {
      this.mostrarModal('La descripción de la empresa es obligatoria.');
      return;
    }
    if (!this.form.rfc || !this.form.rfc.trim()) {
      this.mostrarModal('El RFC Moral es obligatorio.');
      return;
    }
    // Validar formato RFC Moral (12 caracteres: 3 letras + 6 dígitos + 3 alfanuméricos)
    const rfcMoralRegex = /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/i;
    if (!rfcMoralRegex.test(this.form.rfc)) {
      this.mostrarModal('El formato del RFC Moral es inválido. Debe tener exactamente 12 caracteres (ej. SAT970701NN3).');
      return;
    }
    if (!this.form.codigo_postal) {
      this.mostrarModal('El código postal es obligatorio.');
      return;
    }
    if (!this.form.estado) {
      this.mostrarModal('El estado es obligatorio. Por favor ingresa un código postal válido.');
      return;
    }
    if (!this.form.ciudad) {
      this.mostrarModal('La ciudad es obligatoria.');
      return;
    }
    if (!this.form.colonia) {
      this.mostrarModal('La colonia es obligatoria.');
      return;
    }
    if (!this.form.calle || !this.form.calle.trim()) {
      this.mostrarModal('La calle es obligatoria.');
      return;
    }

    this.erroresDuplicados = { correo_electronico: false, rfc: false, nombre_empresa: false };

    const { contrasena_verificar, ...datos } = this.form;

    this.api.registrarEmpleador(datos).subscribe({
      next: (res) => {
        localStorage.removeItem('usuario');
        localStorage.removeItem('token');
        sessionStorage.removeItem('usuario');
        sessionStorage.removeItem('token');

        const user = res.user || {
          id: res.id_empleador,
          nombre: res.nombre_empresa,
          correo: res.correo_electronico,
          rol: 'empleador'
        };

        localStorage.setItem('usuario', JSON.stringify(user));
        localStorage.setItem("token", res.token);

        localStorage.setItem('perfilEmpleador', JSON.stringify({
          id_empleador: res.id_empleador,
          nombre_empresa: this.form.nombre_empresa,
          correo_electronico: this.form.correo_electronico,
          pais: this.form.pais,
          estado: this.form.estado,
          ciudad: this.form.ciudad,
          colonia: this.form.colonia,
          calle: this.form.calle,
          codigo_postal: this.form.codigo_postal,
          telefono: this.form.telefono,
          rfc: this.form.rfc,
          descripcion: this.form.descripcion
        }));

        this.mostrarModalExito(`¡Tu empresa ya forma parte de ChamBee!`);
      },
      error: (err: any) => {
        console.error('Error:', err);
        const mensaje = err?.error?.error || 'Error al crear la cuenta. Intenta de nuevo.';
        this.mostrarModal(mensaje);

        if (err?.error?.duplicateField) {
          const field = err.error.duplicateField;
          if (field === 'rfc') this.erroresDuplicados.rfc = true;
          if (field === 'correo_electronico') this.erroresDuplicados.correo_electronico = true;
          if (field === 'nombre_empresa') this.erroresDuplicados.nombre_empresa = true;
        }
      }
    });
  }
}
