import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs'; 

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.css' 
})
export class SearchResultsComponent implements OnInit {
  query: string = '';
  destacados: any[] = [];
  todosLosResultados: any[] = [];
  cargando: boolean = true;
  
  // Variables del Navbar
  nombre_postulante = 'Usuario';
  foto_perfil = '';
  notificationsOpen = false;
  menuOpen = false;
  isMobile = false;
  hasUnreadNotifications = false;
  notifications: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router,
    private themeService: ThemeService,
    private authApi: AuthService
  ) {}

  ngOnInit() {
    this.checkMobile();
    this.cargarNotificaciones();

    const usuario = this.api.getUsuario();
    if (usuario) {
      this.nombre_postulante = usuario.nombre || 'Usuario';
      this.api.getMiPerfil().subscribe({
        next: (perfil: any) => {
          this.nombre_postulante = perfil?.nombre_postulante || this.nombre_postulante;
          this.foto_perfil = perfil?.foto_perfil || '';
        },
        error: () => {}
      });
    }

    this.route.queryParams.subscribe(params => {
      this.query = (params['q'] || '').toLowerCase();
      this.cargarYFiltrar(this.query);
    });
  }

  cargarYFiltrar(q: string) {
    this.cargando = true;
    forkJoin({
      empleos: this.api.obtenerAnunciosPublicos(),
      servicios: this.api.obtenerServiciosPublicos()
    }).subscribe({
      next: (resp: any) => {
        const empleos = (resp.empleos || []).map((e: any) => ({ ...e, tipo: 'empleo' }));
        const servicios = (resp.servicios || []).map((s: any) => ({ ...s, tipo: 'servicio' }));
        const combinados = [...empleos, ...servicios];

        if (q) {
          this.todosLosResultados = combinados.filter(item =>
            (item.titulo || item.title || '').toLowerCase().includes(q) ||
            (item.nombre_empresa || item.company || item.descripcion || '').toLowerCase().includes(q)
          );
        } else {
          this.todosLosResultados = combinados;
        }

        this.destacados = this.todosLosResultados.slice(0, 3);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar datos:', err);
        this.cargando = false;
      }
    });
  }

  // --- LÓGICA DE TARJETAS Y BÚSQUEDA ---
  irAlDetalle(item: any) {
    const id = item.id_anuncio || item.id_servicio || item.id;
    if (item.tipo === 'empleo') {
      this.router.navigate(['/job', id]);
    } else {
      this.router.navigate(['/services']); 
    }
  }

  nuevaBusqueda(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.value.trim() !== '') {
      this.router.navigate(['/search'], { queryParams: { q: input.value } });
    }
  }

  // --- LÓGICA DEL NAVBAR (Modo Oscuro, Menús, Notificaciones) ---
  irAlPerfil() {
    this.router.navigate(['/perfil-postulante']);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  toggleMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notificationsOpen = false;
  }

  logout() {
    this.authApi.logout();
    this.menuOpen = false;
  }

  cargarNotificaciones() {
    this.api.obtenerNotificaciones().subscribe({
      next: (notifs: any[]) => {
        this.notifications = notifs.map(n => ({
          ...n,
          time: new Date(n.time).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
        }));
        this.hasUnreadNotifications = this.notifications.some(n => !n.read);
      },
      error: () => {}
    });
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;
    this.menuOpen = false;
    
    if (this.notificationsOpen && this.hasUnreadNotifications) {
      this.hasUnreadNotifications = false;
      this.notifications.forEach(n => n.read = true);
      this.api.marcarNotificacionesLeidas().subscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick() {
    if (this.notificationsOpen) this.notificationsOpen = false;
    if (this.menuOpen && !this.isMobile) this.menuOpen = false;
  }

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  checkMobile() {
    try {
      this.isMobile = window.innerWidth <= 768;
    } catch {
      this.isMobile = false;
    }
  }
}