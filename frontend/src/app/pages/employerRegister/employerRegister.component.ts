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
    correo: '',
    password: '',
    password_verificar: '',
    telefono: '',
    descripcion: '',
    rfc: '',
    pais: 'México',
    estado: '',
    ciudad: '',
    colonia: '',
    calle: '',
    cp: ''
  };

  colonias: string[] = [];
  buscandoCP = false;

  constructor(private api: ApiService, private router: Router, private http: HttpClient) {}

  // --- BUSCAR CÓDIGO POSTAL ---
  buscarCP() {
    const cp = this.form.cp.trim();
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
          alert('Código postal no encontrado');
          this.form.estado = '';
          this.form.ciudad = '';
          this.colonias = [];
        }
        this.buscandoCP = false;
      },
      error: () => {
        alert('Error al cargar los códigos postales');
        this.buscandoCP = false;
      }
    });
  }

  registrar() {
    if (this.form.password !== this.form.password_verificar) {
      alert('Las contraseñas no coinciden');
      return;
    }

    const { password_verificar, ...datos } = this.form;

    // Validar campos obligatorios
    const camposVacios = Object.values(datos).some(valor => !valor || valor.toString().trim() === '');
    if (camposVacios) {
      alert('Todos los campos son obligatorios');
      return;
    }

    this.api.registrarEmpleador(datos).subscribe({
      next: (res) => {
        alert(`Cuenta creada para ${res.nombre_empresa}`);

        // --- CAMBIO AQUÍ ---
        // Ahora redirige a las etiquetas después de registrar la empresa
        this.router.navigate(['/job-preferences']);
      },
      error: (err) => {
        console.error('Error:', err);
        alert('Error al crear la cuenta');
      }
    });
  }
}