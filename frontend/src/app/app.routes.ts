import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EmployerRegisterComponent } from './pages/employerRegister/employerRegister.component';
import { RegisterComponent } from './pages/register/register.component';
import { LoginComponent } from './pages/login/login.component'; 
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';


// 1. Importamos tu nuevo componente de etiquetas
import { JobPreferencesComponent } from './pages/job-preferences/job-preferences.component';

export const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent 
  },
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: 'employer-register', 
    component: EmployerRegisterComponent 
  },
  { 
    path: 'register', 
    component: RegisterComponent 
  },
<<<<<<< HEAD
  {
    path: 'job-preferences',
    component: JobPreferencesComponent
=======
 { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { 
    path: '**', 
    redirectTo: '' 
>>>>>>> ea7b78c74db7c2c451c50937fd80e248e349940f
  }
];