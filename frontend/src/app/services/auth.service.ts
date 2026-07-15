import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private API_URL = 'http://localhost:3000'; 

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: { correo_electronico: string, contrasena: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/login`, credentials);
  }

  clearSession(){
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('perfilEmpleador');
    localStorage.removeItem('perfilPostulante');

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('perfilEmpleador');
    sessionStorage.removeItem('perfilPostulante');
  }

  logout(){
    this.clearSession();
    this.router.navigate(['/'])
  }

  getToken(): string | null {
    const sessionToken = sessionStorage.getItem('token');
    const localToken = localStorage.getItem('token');

    const validSessionToken = sessionToken && !this.isTokenExpired(sessionToken) ? sessionToken : null;
    const validLocalToken = localToken && !this.isTokenExpired(localToken) ? localToken : null;

    if (validSessionToken) return validSessionToken;
    if (validLocalToken) return validLocalToken;

    return null;
  }

  parseJwt(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const decoded = this.parseJwt(token);

    // Si de plano no se pudo decodificar, sí está mal
    if (!decoded) return true; 
    
    // CORRECCIÓN: Si el token no trae fecha de expiración (exp), lo dejamos pasar por ahora
    if (!decoded.exp) return false; 

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }
}