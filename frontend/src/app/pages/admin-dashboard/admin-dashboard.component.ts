import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

interface UsuarioReportado {
  nombre: string;
  apellidoP: string;
  apellidoM: string;
  fecha: string;
}

interface AnuncioReportado {
  titulo: string;
  razon: string;
}

interface NotificacionReporte {
  mensaje: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  nombreAdmin = 'Administrador';
  
  usuariosReportados: UsuarioReportado[] = [
    { nombre: 'Juan Papu', apellidoP: 'Gonzales', apellidoM: 'Piña', fecha: '22/02/2026' },
    { nombre: 'Isai Larto', apellidoP: 'Juarez', apellidoM: 'Juarez', fecha: '22/02/2026' },
    { nombre: 'Anshelo', apellidoP: 'Liar', apellidoM: 'Ortega', fecha: '21/02/2026' },
    { nombre: 'Frida', apellidoP: 'Kalo', apellidoM: 'Rivera', fecha: '20/02/2026' }
  ];

  anunciosReportados: AnuncioReportado[] = [
    { titulo: 'Buscamos perritos calientes', razon: 'Titulo inapropiado' },
    { titulo: 'Estas viendo eso solo', razon: 'Descripcion incorrecta' },
    { titulo: 'Busco wapos infieles', razon: 'Posible fraude' },
    { titulo: 'Eskibiforniteponmi', razon: 'no lo se se me acabo la idea' }
  ];

  notificaciones: NotificacionReporte[] = [
    { mensaje: 'Nuevo reporte sobre anuncio de Mario Sanchez por titulo de publicacion: Venta de fentanilo' },
    { mensaje: 'Nuevo reporte sobre usuario diego velasquez juarez por comentario inapropiado' },
    { mensaje: 'Nuevo reporte sobre anuncio de Abigail Fresa por por comentario inapropiado' },
    { mensaje: 'Nuevo reporte sobre Usuario Alma marcela gozo Rico por nombre inapropiado' },
    { mensaje: 'Nuevo reporte sobre Anuncio de Carla Panini por posible fraude' }
  ];

  constructor() {}

 ngOnInit(): void {
    const datosUsuario = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (datosUsuario) {
      const usuarioObj = JSON.parse(datosUsuario);
      
      // Busca el nombre en cualquier variante que pueda mandar la API
      this.nombreAdmin = usuarioObj.nombre || usuarioObj.name || usuarioObj.username || 'Administrador';
    }
  }

  suspenderCuenta(usuario: UsuarioReportado) {
    console.log('Suspendiendo cuenta de', usuario.nombre);
  }

  eliminarCuenta(usuario: UsuarioReportado) {
    console.log('Eliminando cuenta de', usuario.nombre);
  }

  eliminarAnuncio(anuncio: AnuncioReportado) {
    console.log('Eliminando anuncio:', anuncio.titulo);
  }
}