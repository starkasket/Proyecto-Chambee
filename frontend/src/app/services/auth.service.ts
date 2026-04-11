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
    localStorage.clear();
    sessionStorage.clear();
  }

  logout(){
    this.clearSession();
    this.router.navigate(['/'])
  }

  getToken(): string | null {
    
  const token =  localStorage.getItem('token') || sessionStorage.getItem('token');

  if (!token) return null;

  if (this.isTokenExpired(token)) {
    this.logout();
     return null;
  }

  return token;
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

    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }
}