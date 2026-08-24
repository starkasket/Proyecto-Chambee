import { Component, inject, OnDestroy } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  private redirectAfterLogin = '/home-user';

  // --- CONTROL DE MODALES ---
  modalMensaje = '';
  mostrarPassword = false;

  // --- VARIABLES DEL TEMPORIZADOR DE SUSPENSIÓN ---
  mostrarModalSuspendido: boolean = false;
  tiempoInterval: any;
  diasRestantes: number = 0;
  horasRestantes: number = 0;
  minutosRestantes: number = 0;
  segundosRestantes: number = 0;

  // Inyectamos el servicio del tema
  private readonly themeService = inject(ThemeService);

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

          this.authService.clearSession();

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
            : user.rol === 'administrador'
            ? '/admin-login' 
            : '/home-user';

          console.log('Respuesta del servidor:', res);
          this.mostrarModalExito();
        },
        error: (err) => {
          console.error('Error en el login:', err);
          
          // --- AQUÍ ATRAPAMOS EL ERROR DE CUENTA SUSPENDIDA ---
          if (err.status === 403 && err.error?.error === 'cuenta_suspendida') {
            this.iniciarTemporizador(err.error.suspendido_hasta);
          } 
          // --- VALIDAMOS SI LA CUENTA FUE ELIMINADA ---
          else if (err.status === 401 && err.error?.error === 'Cuenta eliminada') {
            this.mostrarModal('Esta cuenta ha sido eliminada por infringir nuestras normas.');
          }
          // --- ERROR NORMAL DE CORREO/CONTRASEÑA ---
          else {
            this.mostrarModal('Hijole, algo fallo. Revisa que tus datos sean correctos.');
          }
        }
      });
    } else {
      this.mostrarModal('Formulario no valido. Checa el correo o la contraseña.');
    }
  }

  // --- LÓGICA DEL TEMPORIZADOR DE SUSPENSIÓN ---
  iniciarTemporizador(fechaFinISO: string) {
    this.mostrarModalSuspendido = true;
    const fechaFin = new Date(fechaFinISO).getTime();

    // Limpiar intervalo anterior si existe
    if (this.tiempoInterval) {
      clearInterval(this.tiempoInterval);
    }

    // Ejecutar cálculo inmediatamente
    this.calcularTiempo(fechaFin);

    // Actualizar cada segundo (1000 ms)
    this.tiempoInterval = setInterval(() => {
      this.calcularTiempo(fechaFin);
    }, 1000);
  }

  calcularTiempo(fechaFin: number) {
    const ahora = new Date().getTime();
    const diferencia = fechaFin - ahora;

    if (diferencia <= 0) {
      // El castigo terminó mientras tenía el modal abierto
      clearInterval(this.tiempoInterval);
      this.mostrarModalSuspendido = false;
      this.mostrarModal('¡Tu suspensión ha terminado! Ya puedes iniciar sesión nuevamente.');
      return;
    }

    // Cálculos matemáticos de fechas
    this.diasRestantes = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    this.horasRestantes = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    this.minutosRestantes = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    this.segundosRestantes = Math.floor((diferencia % (1000 * 60)) / 1000);
  }

  cerrarModalSuspendido() {
    this.mostrarModalSuspendido = false;
    if (this.tiempoInterval) clearInterval(this.tiempoInterval);
  }

  // Limpiar el intervalo de memoria cuando cambiamos de página
  ngOnDestroy() {
    if (this.tiempoInterval) {
      clearInterval(this.tiempoInterval);
    }
  }
}