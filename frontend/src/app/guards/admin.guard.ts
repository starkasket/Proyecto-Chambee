import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const rol = token ? authService.parseJwt(token)?.rol : null;

  if (rol === 'administrador') {
    return true;
  }

  authService.clearSession();
  router.navigate(['/login-admin']);
  return false;
};
