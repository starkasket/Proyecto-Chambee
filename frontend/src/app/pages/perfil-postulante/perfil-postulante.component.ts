import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service'; // Asegúrate de tener este servicio importado

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

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

type ProfileSectionTab = 'postulaciones' | 'favoritos' | 'recomendados';

@Component({
  selector: 'app-perfil-postulante',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './perfil-postulante.component.html',
  styleUrls: ['./perfil-postulante.component.css']
})
export class PerfilPostulanteComponent implements OnInit {
  postulanteId = '';
  perfil: PostulanteProfile | null = null;
  cargando = true;
  error = '';
  
  menuOpen = false;
  notificationsOpen = false;
  hasUnreadNotifications = true;
  isMobile = false;
  activeTab: ProfileSectionTab = 'postulaciones';

  // Datos de prueba para simular la vista
  postulaciones: PostulanteApplication[] = [
    {
      id: "app-001",
      empresa: "TechNova Solutions",
      estado: "En revision",
      ubicacion: "Remoto / Madrid",
      fecha: "15 Mar 2026",
      candidatos: 45,
      vacante: "Senior Frontend Developer",
      resumen: "Liderazgo de equipo técnico para la migración de microfrontends usando React y Next.js.",
      imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
    },
    {
      id: "app-002",
      empresa: "AT&T S.M.A",
      estado: "Entrevista",
      ubicacion: "San Miguel de Allende",
      fecha: "10 Mar 2026",
      candidatos: 12,
      vacante: "Desarrollador Fullstack",
      resumen: "Mantenimiento de bases de datos PostgreSQL y desarrollo de APIS en Node.js.",
      imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
    }
  ];

  favoritos: PostulanteFavorites[] = [
    {
      id: 'fav-1',
      empresa: 'Guanajuato Motors',
      estado: 'Activa',
      ubicacion: 'San Miguel de Allende',
      fecha: 'Hace 2 días',
      candidatos: 8,
      vacante: 'Mecánico de Motocicletas',
      resumen: 'Mantenimiento preventivo y correctivo. Experiencia deseable en Vento.',
      imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
    }
  ];

  recomendados: PostulanteFavorites[] = [
    {
      id: 'rec-1',
      empresa: 'WebCorp SMA',
      estado: 'Activa',
      ubicacion: 'Centro, San Miguel de Allende',
      fecha: 'Hoy',
      candidatos: 2,
      vacante: 'Angular Jr. Developer',
      resumen: 'Únete a nuestro equipo para desarrollar interfaces modernas.',
      imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=60'
    }
  ];

  notifications: NotificationItem[] = [
    { id: 1, title: '¡Bienvenido!', message: 'Tu perfil ha sido creado con éxito.', time: 'Hace 1 min', read: false },
    { id: 2, title: 'Sugerencia', message: 'Sube tu CV para tener más oportunidades.', time: 'Hace 5 min', read: false }
  ];

  constructor(
    private router: Router, 
    private authApi: AuthService, 
    private readonly api: ApiService,
    private readonly themeService: ThemeService // Integrado del diseño empresarial
  ) {}

  ngOnInit(): void {
    const usuario = this.api.getUsuario();
    const perfilLocalRaw = localStorage.getItem('perfilPostulante') || sessionStorage.getItem('perfilPostulante');

    if (!usuario) {
      this.error = 'No hay sesión activa. Inicia sesión para ver tu perfil.';
      this.cargando = false;
      return;
    }

    if (usuario.rol !== 'postulante') {
      this.error = 'Esta sección es solo para postulantes.';
      this.cargando = false;
      return;
    }
    
    if (perfilLocalRaw) {
      this.perfil = JSON.parse(perfilLocalRaw);
    }

    this.api.getMiPerfil().subscribe({
      next: (perfil: any) => {
        this.perfil = perfil;
        if (localStorage.getItem('token')) {
          localStorage.setItem("perfilPostulante", JSON.stringify(perfil));
        } else {
          sessionStorage.setItem("perfilPostulante", JSON.stringify(perfil));
        }
        this.cargando = false;
      }, 
      error: () => {
        this.cargando = false;
        if (!this.perfil) {
          this.error = "No fue posible cargar tu perfil en este momento";
        }
      }
    });

    this.checkMobile();
  }

  get direccionCompleta(): string {
    if (!this.perfil) return '';
    return `${this.perfil.calle}, ${this.perfil.colonia}, ${this.perfil.ciudad}, ${this.perfil.estado}, ${this.perfil.pais}`;
  }

  setActiveTab(tabName: ProfileSectionTab) {
    this.activeTab = tabName;
  }

  // --- LÓGICA DE ESTADOS Y BADGES CSS ---
  getApplicationStateClass(estado: PostulanteApplication['estado']): string {
    if (estado === 'Nueva') return 'app-new';
    if (estado === 'En revision') return 'app-review';
    if (estado === 'Entrevista') return 'app-interview';
    return 'app-discarded';
  }

  getJobStateClass(estado: PostulanteFavorites['estado']): string {
    if (estado === 'Activa') return 'state-active';
    if (estado === 'Pausada') return 'state-paused';
    return 'state-closed';
  }

  // --- NAVEGACIÓN Y MENÚS ---
  toggleNotifications(event?: Event) {
    if (event) event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;
    
    if (this.notificationsOpen) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);
    }
    this.menuOpen = false;
  }

  toggleMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.notificationsOpen) this.notificationsOpen = false;
    if (this.menuOpen && !this.isMobile) this.menuOpen = false;
  }

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  private checkMobile() {
    try {
      this.isMobile = window.innerWidth <= 768;
    } catch {
      this.isMobile = false;
    }
  }

  // --- THEMING ---
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  // --- ACCIONES ---
  volverPanel() {
    this.router.navigate(['/inicio-postulante']);
  }

  editarPerfil() {
    this.router.navigate(['/perfil-postulante/editar']);
  }

  buscarEmpleos() {
    this.router.navigate(['/buscar-empleos']);
  }

  logout() {
    this.authApi.logout();
    this.menuOpen = false;
  }
}