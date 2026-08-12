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

  erroresDuplicados = {
    correo_electronico: false,
    curp: false,
    rfc: false
  };

  esMayorDeEdad(fecha: string): boolean {
    if (!fecha) return false;

    const hoy = new Date();
    const nacimiento = new Date(fecha);

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

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
  modalErrorVisible = false;
  modalExitoVisible = false;

  constructor(private api: ApiService, private router: Router) { }

  ngOnInit() {
    this.api.getSepomex().subscribe(data => this.sepomex = data);

  }

  // --- MODAL DE ERROR ---
  mostrarModal(mensaje: string) {
    this.modalMensaje = mensaje;
    this.modalErrorVisible = true;
  }

  cerrarModal() {
    this.modalErrorVisible = false;
    this.modalMensaje = '';
  }

  // --- MODAL DE ÉXITO ---
  mostrarModalExito(mensaje: string) {
    this.modalMensaje = mensaje;
    this.modalExitoVisible = true;
  }

  cerrarModalExito() {
    this.modalExitoVisible = false;
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
    // Validar campos vacíos y específicos con mensajes claros
    if (!this.form.nombre_postulante || !this.form.nombre_postulante.trim()) {
      this.mostrarModal('El nombre es obligatorio.');
      return;
    }
    if (!this.form.apellido_paterno_postulante || !this.form.apellido_paterno_postulante.trim()) {
      this.mostrarModal('El apellido paterno es obligatorio.');
      return;
    }
    if (!this.form.apellido_materno_postulante || !this.form.apellido_materno_postulante.trim()) {
      this.mostrarModal('El apellido materno es obligatorio.');
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
    // Validar patrón de contraseña
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;
    if (!passRegex.test(this.form.contrasena)) {
      this.mostrarModal('La contraseña debe tener al menos 6 caracteres: una minúscula, una mayúscula, un número y un símbolo.');
      return;
    }
    if (!this.form.fecha_nacimiento) {
      this.mostrarModal('La fecha de nacimiento es obligatoria.');
      return;
    }
    if (!this.esMayorDeEdad(this.form.fecha_nacimiento)) {
      this.mostrarModal('Debes ser mayor de edad para registrarte (18 años o más).');
      return;
    }
    if (!this.form.sexo) {
      this.mostrarModal('El sexo es obligatorio.');
      return;
    }
    if (!this.form.rfc) {
      this.mostrarModal('El RFC es obligatorio.');
      return;
    }
    // Validar formato RFC (Persona Física)
    const rfcRegex = /^[A-Z&Ññ]{4}[0-9]{6}[A-Z0-9]{3}$/i;
    if (!rfcRegex.test(this.form.rfc)) {
      this.mostrarModal('El formato del RFC es inválido. Debe tener exactamente 13 caracteres con la estructura oficial (ej. PEMA8505152A2).');
      return;
    }
    if (!this.form.curp) {
      this.mostrarModal('La CURP es obligatoria.');
      return;
    }
    // Validar formato CURP
    const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/i;
    if (!curpRegex.test(this.form.curp)) {
      this.mostrarModal('El formato de la CURP es inválido. Debe tener exactamente 18 caracteres con la estructura oficial (ej. LOOA531113HTCPBN07).');
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
    if (!this.form.telefono || !this.form.telefono.trim()) {
      this.mostrarModal('El teléfono es obligatorio.');
      return;
    }

    this.erroresDuplicados = {
      correo_electronico: false,
      curp: false,
      rfc: false
    };

    const { contrasena_verificar, ...datos } = this.form;

    this.api.registrarPostulante(datos).subscribe({
      next: (res) => {
        this.mostrarModalExito('¡Bienvenido a ChamBee!');
        const user = res.user;

        localStorage.setItem("token", res.token);

        localStorage.setItem('usuario', JSON.stringify(user));
      },
      error: (err: any) => {
        console.error('Error:', err);
        const mensaje = err?.error?.error || 'Error al crear la cuenta. Intenta de nuevo.';
        this.mostrarModal(mensaje);

        if (err?.error?.duplicateField) {
          const field = err.error.duplicateField;
          if (field === 'curp') this.erroresDuplicados.curp = true;
          if (field === 'rfc') this.erroresDuplicados.rfc = true;
          if (field === 'correo_electronico') this.erroresDuplicados.correo_electronico = true;
        }
      }
    });
  }
}