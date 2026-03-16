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

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService,
    private router: Router 
  ) {
    this.loginForm = this.fb.group({
      // Validación de email estándar
      email: ['', [Validators.required, Validators.email]],
      // caracteres de contraseña
      password: ['', [Validators.required, Validators.minLength(3)]], 
      remember: [false]
    });
  }

  onLogin() {
    if (this.loginForm.valid) {
      console.log('Enviando datos al servidor...', this.loginForm.value);
      
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
        
          alert('¡Bienvenido a Chambee!');
          console.log('Respuesta del servidor:', res);
          
        
          this.router.navigate(['/']); 
        },
        error: (err) => {
          console.error('Error en el login:', err);
          alert('Híjole, algo falló. Revisa que el servidor esté prendido o tus datos sean correctos.');
        }
      });
    } else {
      
      alert('Formulario no válido. Checa el correo o la contraseña (mínimo 3 caracteres).');
    }
  }
}