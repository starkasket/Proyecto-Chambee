import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

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
    pais: '',
    estado: '',
    ciudad: '',
    colonia: '',
    calle: '',
    codigo_postal: ''
  };

  constructor(private api: ApiService, private router: Router) {}

  registrar() {




    if (this.form.contrasena !== this.form.contrasena_verificar) {
      alert('Las contraseñas no coinciden');
      return;
    }

    const { contrasena_verificar, ...datos } = this.form;
    
      // Validar campos obligatorios
  const camposVacios = Object.values(datos).some(valor => !valor || valor.toString().trim() === '');
  if (camposVacios) {
    alert('Todos los campos son obligatorios');
    return;
  }

    this.api.registrarPostulante(datos).subscribe({
      next: (res) => {
        alert(`Cuenta creada para ${res.nombre}`);
        
        this.router.navigate(['/job-preferences']);
      },
      error: (err) => {
        console.error('Error:', err);
        alert('Error al crear la cuenta');
      }
    });
  }
}