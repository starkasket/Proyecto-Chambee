import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EmployerRegisterComponent  } from './pages/employerRegister/employerRegister.component';
import { RegisterComponent } from './pages/register/register.component';

// 1. Importamos tu nuevo componente de etiquetas
import { JobPreferencesComponent } from './pages/job-preferences/job-preferences.component';

export const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent 
  },
  { 
    path: 'employer-register', 
    component: EmployerRegisterComponent 
  },
  { 
    path: 'register', 
    component: RegisterComponent 
  },
  {
    path: 'job-preferences',
    component: JobPreferencesComponent
  }
];