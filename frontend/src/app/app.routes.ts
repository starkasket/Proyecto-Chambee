import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EmployerRegisterComponent } from './pages/employerRegister/employerRegister.component';
import { RegisterComponent } from './pages/register/register.component';
import { LoginComponent } from './pages/login/login.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { JobPreferencesComponent } from './pages/job-preferences/job-preferences.component';
import { HomeUserComponent } from './pages/home-user/home-user.component';
import { HomeEmployerComponent } from './pages/home-employer/home-employer.component';
import { PerfilPostulanteComponent } from './pages/perfil-postulante/perfil-postulante.component';
import { EmployerProfileComponent } from './pages/employer-profile/employer-profile.component';
import { EmployerProfileEditComponent } from './pages/employer-profile-edit/employer-profile-edit.component';
import { EmployerJobCreateComponent } from './pages/employer-job-create/employer-job-create.component';
import { CrearServicioComponent } from './pages/crear-servicio/crear-servicio.component'; 
import { JobDetailComponent } from './pages/job-detail/job-detail.component';
import { Path } from 'leaflet';
import { PerfilPostulanteEditarComponent } from './pages/perfil-postulante-editar/perfil-postulante-editar.component';

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
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: 'job-preferences',
    component: JobPreferencesComponent
  },
  {
    path: 'home-user',
    component: HomeUserComponent
  },
  {
    path: 'home-employer',
    component: HomeEmployerComponent
  },
  {
    path: 'perfil-postulante',
    component: PerfilPostulanteComponent
  },
  {
    path: 'perfil',
    // Pantalla donde el empleador consulta su informacion registrada.
    component: EmployerProfileComponent
  },
  {
    path: 'perfil/editar',
    component: EmployerProfileEditComponent
  },
  {
    path: 'post-job',
    component: EmployerJobCreateComponent
  },
  {
    path: 'crear-servicio', // <-- Nueva ruta para el botón +
    component: CrearServicioComponent
  },
  {
    path: 'job/:id', 
    component: JobDetailComponent
  },
  {
    path: 'perfil-postulante/editar',
    component: PerfilPostulanteEditarComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];