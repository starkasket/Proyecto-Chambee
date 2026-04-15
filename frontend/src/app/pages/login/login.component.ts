import { Component, inject } from '@angular/core'; // <-- Importa 'inject'
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service'; // <-- Importa el ThemeService

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  private redirectAfterLogin = '/home-user';

  // --- CONTROL DE MODALES ---
  modalMensaje = '';
  mostrarPassword = false;

  // Inyectamos el servicio del tema
  private themeService = inject(ThemeService);

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

  // --- LÓGICA DEL TEMA OSCURO ---
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
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

  // --- MODAL DE EXITO ---
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
    this.router.navigate([this.redirectAfterLogin]);
  }

  onLogin() {
    if (this.loginForm.valid) {
      console.log('Enviando datos al servidor...', this.loginForm.value);

      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          const user = res.user;
          const remember = this.loginForm.value.remember;

          if (remember) {
            localStorage.setItem("token", res.token);
            localStorage.setItem('usuario', JSON.stringify({
              id: user.id,
              nombre: user.nombre,
              correo: user.correo,
              rol: user.rol
            }));
          } else {
            sessionStorage.setItem("token", res.token);
            sessionStorage.setItem('usuario', JSON.stringify({
              id: user.id,
              nombre: user.nombre,
              correo: user.correo,
              rol: user.rol
            }));
          }

          this.redirectAfterLogin = user.rol === 'empleador'
            ? '/home-employer'
            : '/home-user';

          console.log('Respuesta del servidor:', res);
          this.mostrarModalExito();
        },
        error: (err) => {
          console.error('Error en el login:', err);
          this.mostrarModal('Hijole, algo fallo. Revisa que tus datos sean correctos.');
        }
      });
    } else {
      this.mostrarModal('Formulario no valido. Checa el correo o la contraseña.');
    }
  }
}