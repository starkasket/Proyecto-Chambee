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
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    correo_electronico: '',
    sexo: '',
    contrasena: '',
    contrasena_verificar: '',
    rfc: '',
    curp: '',
    pais: 'México',
    estado: '',
    ciudad: '',
    colonia: '',
    calle: '',
    codigo_postal: ''
  };

  sepomex: any[] = [];
  colonias: string[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getSepomex().subscribe(data => this.sepomex = data);
  }

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
      alert('Código postal no encontrado');
    }
  }

  registrar() {
    const { contrasena_verificar, ...datos } = this.form;

    const camposVacios = Object.values(datos).some(v => !v || v.toString().trim() === '');
    if (camposVacios) {
      alert('Todos los campos son obligatorios');
      return;
    }

    if (this.form.contrasena !== this.form.contrasena_verificar) {
      alert('Las contraseñas no coinciden');
      return;
    }

    this.api.registrarPostulante(datos).subscribe({
      next: (res) => {
        alert(`Cuenta creada para ${res.nombre}`);
        
        // --- CAMBIO AQUÍ ---
        // Ahora redirige a las preferencias de trabajo en lugar del inicio
        this.router.navigate(['/job-preferences']);
      },
      error: (err) => {
        console.error('Error:', err);
        alert('Error al crear la cuenta');
      }
    });
  }
}