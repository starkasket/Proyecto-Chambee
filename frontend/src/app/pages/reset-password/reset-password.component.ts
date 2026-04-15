import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  token: string | null = null;


  resetForm: FormGroup;

  mostrarPassword = false;
  mostrarPassword2 = false;

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private http: HttpClient) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  get password() {
    return this.resetForm.get('password');
  }

  get confirmPassword() {
    return this.resetForm.get('confirmPassword');
  }

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get("token");


    if (!this.token) {
      this.router.navigate(['/login']);
      return;
    }

    this.http.get(`http://localhost:3000/auth/validate-reset-token/${this.token}`)
    .subscribe({
      next: () => {
      },
      error: () => {
        alert("El enlace ya no es válido o expiró");
        this.router.navigate(['/login']);
      }
    });


  }

  onReset() {

    if (this.resetForm.valid) {
      if (this.resetForm.value.password !== this.resetForm.value.confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }

      this.http.post('http://localhost:3000/auth/reset-password', {
        token: this.token,
        newPassword: this.resetForm.value.password
      }).subscribe({
        next: () => {
          console.log('Cambiando contraseña...', this.resetForm.value);
          alert('Contraseña actualizada');
          this.router.navigate(['/login']);
        },
        error: (err: any) => {
          alert(err.error?.error || 'Error al cambiar contraseña')
        }
      });

    } else {
      alert('Revisa que los campos sean correctos.');
    }
  }
  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value ? null : { mismatch: true }
  }
}