import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  // 1. REVISA AQUÍ: Debe apuntar a 'reset', NO a 'forgot'
  templateUrl: './reset-password.component.html', 
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent { // 2. AQUÍ estaba el error, decía ForgotPasswordComponent
  resetForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  onReset() {
    if (this.resetForm.valid) {
      console.log('Cambiando contraseña...', this.resetForm.value);
      alert('¡Contraseña guardada! Ahora sí, inicia sesión.');
      this.router.navigate(['/login']);
    } else {
      alert('Revisa que los campos sean correctos.');
    }
  }
}