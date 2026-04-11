import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
// Interfaz para las notificaciones (opcional, pero buena práctica)
interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-perfil-postulante',
  standalone: true,
  // IMPORTANTE: Agregamos CommonModule y RouterModule aquí
  imports: [CommonModule, RouterModule], 
  templateUrl: './perfil-postulante.component.html',
  styleUrl: './perfil-postulante.component.css'
})
export class PerfilPostulanteComponent implements OnInit {

  // =========================================
  // LÓGICA DE PESTAÑAS (ESTO ES LO NUEVO)
  // =========================================
  activeTab: string = 'favoritos'; // Por defecto mostrará "Mis favoritos"

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }
  // =========================================


  // Variables para la interfaz y el usuario
  nombre_postulante: string = 'Usuario';
  isDarkMode: boolean = false;
  menuOpen: boolean = false;
  isMobile: boolean = false;
  
  // Variables para las notificaciones
  notificationsOpen: boolean = false;
  hasUnreadNotifications: boolean = true;
  notifications: NotificationItem[] = [
    { id: 1, title: '¡Bienvenido!', message: 'Tu perfil ha sido creado con éxito.', time: 'Hace 1 min', read: false },
    { id: 2, title: 'Sugerencia', message: 'Sube tu CV para tener más oportunidades.', time: 'Hace 5 min', read: false }
  ];

  // Inyectamos el Router para poder hacer redirecciones (ej. al cerrar sesión)
  constructor(private router: Router, private authApi: AuthService) {}

  ngOnInit() {
    // Al iniciar, buscamos el nombre del usuario guardado (si existe)
    const usuarioGuardado = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    if (usuarioGuardado) {
      try {
        const usuarioObj = JSON.parse(usuarioGuardado);
        this.nombre_postulante = usuarioObj.nombre || usuarioGuardado;
      } catch (e) {
        this.nombre_postulante = usuarioGuardado;
      }
    }
    
    // Verificamos el tamaño de la pantalla al inicio
    this.checkMobile();
  }

  // --- MÉTODOS DE LA BARRA DE NAVEGACIÓN ---

  toggleNotifications(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.notificationsOpen = !this.notificationsOpen;
    
    // Si se abre, marcamos como leídas y quitamos el punto rojo
    if (this.notificationsOpen) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);
    }
    this.menuOpen = false;
  }

  // Cierra el dropdown si haces clic afuera
  @HostListener('document:click', ['$event'])
  onDocumentClick() {
    if (this.notificationsOpen) {
      this.notificationsOpen = false;
    }
  }

  // Detecta cuando cambias el tamaño de la ventana (para el menú móvil)
  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  checkMobile() {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) {
      this.menuOpen = false; // Cierra el menú móvil si agrandas la pantalla
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    // Aquí podrías agregar la lógica para cambiar el tema de tu app si tienes un ThemeService
    console.log('Modo oscuro cambiado a:', this.isDarkMode);
  }

  logout() {
   this.authApi.logout();
    this.menuOpen = false;
   
  }

}