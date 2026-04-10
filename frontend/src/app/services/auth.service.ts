import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private API_URL = 'http://localhost:3000'; 

  constructor(private http: HttpClient) { }

  login(credentials: { correo_electronico: string, contrasena: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/login`, credentials);
  }
}