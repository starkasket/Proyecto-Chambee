import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; // 1. Importamos Router y RouterLink
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // 2. Agregamos RouterLink aquí
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;

  // 3. Inyectamos el 'router' en el constructor
  constructor(
    private fb: FormBuilder, 
    private authService: AuthService,
    private router: Router 
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    });
  }

  onLogin() {
    if (this.loginForm.valid) {
      console.log('Enviando datos...', this.loginForm.value);
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          alert('¡Bienvenido a Chambee!');
          // 4. Redirigimos al Home después del éxito
          this.router.navigate(['/']); 
        },
        error: (err) => {
          alert('Híjole, algo falló. Revisa tus datos.');
        }
      });
    } else {
      alert('Formulario no válido. Checa el correo o la contraseña.');
    }
  }
}