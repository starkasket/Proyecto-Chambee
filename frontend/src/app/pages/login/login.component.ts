
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  loginForm: FormGroup;

  // --- CONTROL DE MODALES ---
  modalMensaje = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      correo_electronico: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(3)]],
      remember: [false]
    });
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
  mostrarModalExito() {
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
    this.router.navigate(['/home-user']); 
  }

  onLogin() {
    if (this.loginForm.valid) {
      console.log('Enviando datos al servidor...', this.loginForm.value);

      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          console.log('Respuesta del servidor:', res);
          this.mostrarModalExito();
        },
        error: (err) => {
          console.error('Error en el login:', err);
          this.mostrarModal('Híjole, algo falló. Revisa que el servidor esté prendido o tus datos sean correctos.');
        }
      });

    } else {
      this.mostrarModal('Formulario no válido. Checa el correo o la contraseña (mínimo 3 caracteres).');
    }
  }
}