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
import { PerfilPostulanteEditarComponent } from './pages/perfil-postulante-editar/perfil-postulante-editar.component';
import { EmployerJobsManageComponent } from './pages/employer-jobs-manage/employer-jobs-manage.component';
import { MisFavoritosComponent } from './pages/mis-favoritos/mis-favoritos.component';
import { BorradorServicioComponent } from './pages/borrador-servicio/borrador-servicio.component';
import { CompanyPublicProfileComponent } from './pages/company-public-profile/company-public-profile.component';

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
    path: 'reset-password/:token',
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
    path: 'perfil-postulante/editar',
    component: PerfilPostulanteEditarComponent
  },
  {
    path: 'perfil-postulante/:id',
    component: PerfilPostulanteComponent
  },
  {
    path: 'perfil',
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
    path: 'mis-vacantes',
    component: EmployerJobsManageComponent
  },
  {
    path: 'crear-servicio', 
    component: CrearServicioComponent
  },
  {
    path: 'editar-servicio/:id',
    component: CrearServicioComponent
  },
  {
    path: 'job/:id',
    component: JobDetailComponent
  },
  {
    path: 'empresa/:id',
    component: CompanyPublicProfileComponent
  },
  {
    path: 'mis-favoritos',
    component: MisFavoritosComponent
  },

  {
    path: 'borrador-servicio',
    component: BorradorServicioComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
