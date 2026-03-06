import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EmployerRegisterComponent  } from './pages/employerRegister/employerRegister.component';

export const routes: Routes = [
 { 
    path: '', 
    component: HomeComponent 
  },
  { 
    path: 'employer-register', 
    component: EmployerRegisterComponent 
  }
];