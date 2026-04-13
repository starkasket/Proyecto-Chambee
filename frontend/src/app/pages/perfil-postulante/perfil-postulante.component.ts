import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

interface PostulanteProfile {
  id_postulante?: string; 
  nombre_postulante: string;
  apellido_paterno_postulante: string;
  apellido_materno_postulante: string;
  correo_electronico: string;
  fecha_nacimiento: string;
  sexo: string;
  pais: string;
  estado: string;
  ciudad: string; 
  colonia: string; 
  calle: string;
  codigo_postal: string; 
  telefono: string;
  fecha_registro: string;
  estado_cuenta: string;
  curp: string;
  rfc: string;
  foto_perfil?: string;
}

interface PostulanteApplication {
  id: string;
  empresa: string;
  estado: 'Nueva' | 'En revision' | 'Entrevista' | 'Descartada';
  ubicacion: string;
  fecha: string;
  candidatos: number;
  vacante: string;
  resumen: string;
  imagen: string;
}

interface PostulanteReview {
  id: number;
  autor: string;
  calificacion: number;
  comentario: string;
  fecha: string;
}

interface PostulanteFavorites {
  id: string;
  empresa: string;
  estado: 'Activa' | 'Pausada' | 'Cerrada';
  ubicacion: string;
  fecha: string;
  candidatos: number;
  vacante: string;
  resumen: string;
  imagen: string;
}

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
  styleUrls: ['./perfil-postulante.component.css']
})
export class PerfilPostulanteComponent implements OnInit {
  postulanteId = '';
  perfil: PostulanteProfile | null = null;
  cargando = true;
  error = '';


  // *****   CHANGE    *****
recomendados: PostulanteFavorites[]= [];
postulaciones: PostulanteApplication[] =[
  {
    id: "app-001",
    empresa: "TechNova Solutions",
    estado: "En revision",
    ubicacion: "Remoto / Madrid",
    fecha: "2026-03-15",
    candidatos: 45,
    vacante: "Senior Frontend Developer",
    resumen: "Liderazgo de equipo técnico para la migración de microfrontends usando React y Next.js.",
    imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
  }
];
favoritos: PostulanteFavorites[] = [];


  // =========================================
  // LÓGICA DE PESTAÑAS (ESTO ES LO NUEVO)
  // =========================================
  activeTab: string = 'favoritos'; // Por defecto mostrará "Mis favoritos"

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }
  // =========================================


  // Variables para la interfaz y el usuario
 
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
  constructor(private router: Router, private authApi: AuthService, private readonly api: ApiService) {}

  ngOnInit(): void {
   
    this.cargando = false;
   const usuario = this.api.getUsuario();
   const perfilLocalRaw = localStorage.getItem('perfilPostulante') || sessionStorage.getItem('perfilPostulante');

   if (!usuario) {
    this.error = 'No hay sesión activa. Inicia sesión para ver tu perfil.';
    this.cargando = false;
    return;
   }

   if (usuario.rol !== 'postulante') {
      this.error = 'Esta seccion es solo para postulantes.';
      this.cargando = false;
      return;
   }
    
   if (perfilLocalRaw) {
    this.perfil = JSON.parse(perfilLocalRaw);
   }

   this.api.getMiPerfil().subscribe({
    next: (perfil: any) => {
      this.perfil = perfil;
      console.log(perfil);

      if (localStorage.getItem('token')) {
        localStorage.setItem("perfilPostulante", JSON.stringify(perfil));
      } else{
        sessionStorage.setItem("perfilPostulante", JSON.stringify(perfil))
      }
      // this.cargarAnuncios(perfil.id_empleador);
      
    this.cargando = false;
    }, 
    error: () => {
      this.cargando = false;
      if (!this.perfil) {
        this.error = "No fue posible cargar tu perfil en este momento"
      }
    }
   });
    // Verificamos el tamaño de la pantalla al inicio
    this.checkMobile();
  };

  get direccionCompleta(): string {
    if (!this.perfil) {
      return '';
    }
    return `${this.perfil.calle}, ${this.perfil.colonia}, ${this.perfil.ciudad}, ${this.perfil.estado}, ${this.perfil.pais} `
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

  toggleMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  volverPanel() {
   // this.router.navigate(['/home-user']);
  }

  editarPerfil() {
    //this.router.navigate(['/perfil/editar']);
  }


   getApplicationStateClass(estado: PostulanteApplication['estado']): string {
    if (estado === 'Nueva') return 'app-new';
    if (estado === 'En revision') return 'app-review';
    if (estado === 'Entrevista') return 'app-interview';
    return 'app-discarded';
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