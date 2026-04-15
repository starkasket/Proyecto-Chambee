import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-crear-servicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './crear-servicio.component.html',
  styleUrl: './crear-servicio.component.css'
})
export class CrearServicioComponent implements OnInit {

  foto_perfil: string = '';

  constructor(
    private readonly api: ApiService
  ) { }
  ngOnInit(): void {
    const usuario = this.api.getUsuario();
    if (usuario?.id) {
      this.api.getMiPerfil().subscribe({
        next: (perfil: any) => {
          this.foto_perfil = perfil?.foto_perfil || '';
        },
        error: () => {
          console.log("Error al cargar la foto de perfil.");

        }
      })
    }

  }
}