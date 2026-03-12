import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-employer-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
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
    pais: '',
    estado: '',
    ciudad: '',
    colonia: '',
    calle: '',
    cp: ''
  };

  constructor(private api: ApiService, private router: Router) {}

  registrar() {
    if (this.form.password !== this.form.password_verificar) {
        console.log('Formulario:', this.form);  // ← agregar
      alert('Las contraseñas no coinciden');
      return;
    }

    const { password_verificar, ...datos } = this.form;

    this.api.registrarEmpleador(datos).subscribe({
      next: (res) => {
        alert(`Cuenta creada para ${res.nombre_empresa}`);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Error:', err);
        alert('Error al crear la cuenta');
      }
    });
  }
}