import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
forgotForm: FormGroup;

constructor(private fb: FormBuilder, private http: HttpClient) {
  this.forgotForm = this.fb.group({
    correo_electronico: ['', [Validators.required, Validators.email]]
  })
}

onSubmit(){
  if (this.forgotForm.valid) {
    this.http.post('http://localhost:3000/auth/forgot-password', {
      correo_electronico: this.forgotForm.value.correo_electronico
    }).subscribe({
      next: () => {
        alert('Si el correo existe, revisa tu bandeja');
      },
      error: (err) => {
        console.log(err);
        
        alert(err.error?.message || err.message || 'Error al enviar solicitud');
      }
    })
  }
}


}
