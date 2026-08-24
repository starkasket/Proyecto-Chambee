import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-admin.component.html',
  styleUrls: ['./login-admin.component.css']
})
export class LoginAdminComponent {
  loginForm: FormGroup;
  private redirectAfterLogin = '/admin';

  modalMensaje = '';
  mostrarPassword = false;

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

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  mostrarModal(mensaje: string) {
    this.modalMensaje = mensaje;
    const modal = document.getElementById('modalAlertaAdmin');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModal() {
    const modal = document.getElementById('modalAlertaAdmin');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  mostrarModalExito() {
    const modal = document.getElementById('modalSaludoAdmin');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }

  cerrarModalExito() {
    const modal = document.getElementById('modalSaludoAdmin');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
    this.router.navigate([this.redirectAfterLogin]);
  }

  onLogin() {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          console.log("Respuesta API:", res);
          const user = res.user;

          if(user.rol !== 'admin' && user.rol !== 'administrador') {
             this.authService.clearSession();
             this.mostrarModal('Acceso denegado. Esta cuenta no tiene permisos de administrador.');
             return;
          }

          const remember = this.loginForm.value.remember;
          this.authService.clearSession();

          const storage = remember ? localStorage : sessionStorage;
          storage.setItem("token", res.token);
          storage.setItem('usuario', JSON.stringify({
            id: user.id,
            nombre: user.nombre,
            correo: user.correo,
            rol: user.rol
          }));

          this.mostrarModalExito();
        },
        error: (err) => {
          this.mostrarModal('Credenciales incorrectas o el administrador no existe.');
        }
      });
    } else {
      this.mostrarModal('Formulario no válido. Checa el correo o la contraseña.');
    }
  }
}

