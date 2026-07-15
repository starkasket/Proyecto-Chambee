import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs'; 

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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

  // Si no hay sesión, mostramos el navbar público (login/registrar)
  // en vez del navbar de usuario logueado.
  estaLogueado = false;

  // Estado del modal de detalle de servicio (igual que en home-user.component)
  servicioDetalle: any = null;
  servicioDetalleOpen = false;
  servicioDetalleCargando = false;

  mostrarFiltros = false;

  sepomex: any[] = [];
  ciudades: string[] = [];
  categorias: any[] = [];


  filtros = {
    tipo: '',
    ciudad: '',
    ordenar: 'fecha',
    categoriaEmpleo: '',
    modalidad: '',
    categoriaServicio: '',
    cobertura: ''
  };

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router,
    private themeService: ThemeService,
    private authApi: AuthService
  ) {}

  ngOnInit() {
    this.checkMobile();

    this.api.getSepomex().subscribe((data: any[]) => {
      this.sepomex = data;
      this.ciudades = [...new Set(
        data.map((x: any) => x.ciudad).filter(Boolean)
      )].sort();
    });

  
    

    this.api.obtenerCategorias().subscribe({
      next: (cats) => {
        this.categorias = cats;
      }, 
      error: (err) => {
        console.error(err);
      }
    });

    const usuario = this.api.getUsuario();
    this.estaLogueado = !!this.authApi.getToken();

    // Las notificaciones y el perfil SOLO se cargan si hay sesión activa,
    // de lo contrario el backend responde 401 y el interceptor te manda a /login.
    if (this.estaLogueado) {
      this.cargarNotificaciones();

      if (usuario) {
        this.nombre_postulante = usuario.nombre || 'Usua  rio';
        this.api.getMiPerfil().subscribe({
          next: (perfil: any) => {
            this.nombre_postulante = perfil?.nombre_postulante || this.nombre_postulante;
            this.foto_perfil = perfil?.foto_perfil || '';
          },
          error: () => {}
        });
      }
    }

    this.route.queryParams.subscribe(params => {
      this.query = (params['q'] || '').toLowerCase();
      this.cargarYFiltrar(this.query);
    });
  }

/*   cargarYFiltrar(q: string) {
    this.cargando = true;
    forkJoin({
      empleos: this.api.obtenerAnunciosPublicos(),
      servicios: this.api.obtenerServiciosPublicos()
    }).subscribe({
      next: (resp: any) => {
        const empleos = (resp.empleos || []).map((e: any) => ({ ...e, tipo: 'empleo' }));

        const servicios = (resp.servicios || []).map((s: any) => {
          const nombreAutor = [s.nombre_postulante, s.apellido_paterno_postulante]
            .filter((parte: string) => !!parte && parte.trim() !== '')
            .join(' ');

          return {
            ...s,
            tipo: 'servicio',
            titulo: s.title || s.titulo,
            nombre_empresa: nombreAutor || 'Servicio independiente',
            salario: s.presupuesto || s.salario,
            modalidad: s.modalidad,
            ciudad: s.ciudad,
            categoria: s.categoria,
            img: s.img
          };
        });

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
  } */
  cargarYFiltrar(q: string) {
    this.cargando = true;
   this.api.buscar(q, this.filtros).subscribe({
      next: (datos) => {
        this.todosLosResultados=datos;
        this.destacados=datos.slice(0,3);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar datos:', err);
        this.cargando = false;
      }
    });
  }

  onTipoChange() {
    this.filtros.categoriaEmpleo = '';
    this.filtros.categoriaServicio = '';

    this.filtros.modalidad = '';
    this.filtros.cobertura = '';
  }

  

  // --- LÓGICA DE TARJETAS Y BÚSQUEDA ---
  irAlDetalle(item: any) {
    if (item.tipo === 'empleo') {
      const id = item.id_anuncio || item.id;
      // Ver el detalle de un empleo NO requiere sesión.
      // Postularse sí la requiere, pero eso se valida dentro de job-detail.
      this.router.navigate(['/job', id]);
    } else {
      this.abrirServicio(item);
    }
  }

  abrirServicio(item: any) {
    const id = item.id_servicio || item.id;
    if (!id) return;

    this.servicioDetalleCargando = true;
    this.servicioDetalleOpen = true;

    this.api.obtenerServicioDetalle(String(id)).subscribe({
      next: (detalle) => {
        this.servicioDetalle = detalle;
        this.servicioDetalleCargando = false;
      },
      error: (err) => {
        console.error('Error al cargar detalle del servicio:', err);
        this.servicioDetalle = item;
        this.servicioDetalleCargando = false;
      }
    });
  }

  cerrarDetalleServicio() {
    this.servicioDetalleOpen = false;
    this.servicioDetalle = null;
  }

  verPerfilAutor(autorId: string) {
    if (autorId) {
      this.cerrarDetalleServicio();
      this.router.navigate(['/perfil-postulante', autorId]);
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
    if (this.estaLogueado) {
      this.router.navigate(['/perfil-postulante']);
    } else {
      this.router.navigate(['/login']);
    }
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

  toggleFiltros(){
    this.mostrarFiltros=!this.mostrarFiltros;
  }

  limpiarFiltros(){
    this.filtros = {
      tipo: '',
      ciudad: '',
      ordenar: 'fecha',
      categoriaEmpleo: '',
      categoriaServicio: '',
      modalidad: '',
      cobertura: ''
    };
    this.cargarYFiltrar(this.query);
  }

  logout() {
    this.authApi.logout();
    this.menuOpen = false;
  }

  aplicarFiltros(){
    this.cargarYFiltrar(this.query);
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