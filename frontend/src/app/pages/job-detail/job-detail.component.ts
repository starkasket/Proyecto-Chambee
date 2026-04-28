import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http'; 
import { JobCardComponent } from '../../components/job-card/job-card.component';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, JobCardComponent],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.css'
})
export class JobDetailComponent implements OnInit {
  
  // Datos del perfil y la vacante
  foto_perfil: string = '';
  jobId: string | null = null;
  jobData: any = null; 
  relatedJobs: any[] = [];
  
  // Control de UI y Mapa
  mostrarMapa: boolean = false;
  private map: any;

  // Inyecciones de dependencias
  private route = inject(ActivatedRoute);
  private router = inject(Router); 
  private location = inject(Location); 
  private platformId = inject(PLATFORM_ID);
  private themeService = inject(ThemeService);
  private api = inject(ApiService);
  private http = inject(HttpClient);

  ngOnInit(): void {
    // 1. Detectar el ID de la vacante en la URL
    this.route.paramMap.subscribe(params => {
      this.jobId = params.get('id');
      this.cargarDetalles(this.jobId);
      this.mostrarMapa = false; // Resetear el estado del mapa al cambiar de vacante
    });

    this.cargarTrabajosRelacionados();
    this.cargarFotoPerfil();
  }

  private cargarFotoPerfil() {
    const usuario = this.api.getUsuario();
    if (usuario?.id) {
      this.api.getMiPerfil().subscribe({
        next: (perfil: any) => {
          this.foto_perfil = perfil?.foto_perfil || '';
        },
        error: (err) => console.error("Error al cargar foto:", err)
      });
    }
  }

  // --- LÓGICA DE POSTULACIÓN ---
  postular() {
    if (!this.jobId) return;

    this.api.postularAAnuncio(this.jobId).subscribe({
      next: (res) => {
        alert('¡Postulación enviada con éxito! El empleador revisará tu perfil pronto.');
      },
      error: (err) => {
        console.error("Error al postular:", err);
        // Mostramos el mensaje de error que viene del backend (ej: "Ya te has postulado")
        alert(err.error?.error || 'No fue posible completar la postulación.');
      }
    });
  }

  // --- LÓGICA DE INTERFAZ ---
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  irAlPerfil() {
    this.router.navigate(['/perfil-postulante']);
  }

  goBack(): void {
    this.location.back();
  }

  verOtroEmpleo(id: string) {
    this.router.navigate(['/job', id]);
  }

  // --- ARREGLO DE UBICACIÓN (MAPA DINÁMICO) ---
  toggleVerMas(): void {
    this.mostrarMapa = !this.mostrarMapa;
    if (this.mostrarMapa && isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initMap();
      }, 150);
    }
  }

  private initMap(): void {
    if (this.map) {
      this.map.remove();
    }

    const iconDefault = L.icon({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    const direccionParaBuscar = this.jobData?.direccion;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccionParaBuscar)}`;

    this.http.get<any[]>(url).subscribe({
      next: (resultado) => {
        let lat = 20.5888; 
        let lon = -100.3899;

        if (resultado && resultado.length > 0) {
          lat = parseFloat(resultado[0].lat);
          lon = parseFloat(resultado[0].lon);
        }

        this.map = L.map('map').setView([lat, lon], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        L.marker([lat, lon]).addTo(this.map)
          .bindPopup(`<b>${this.jobData?.companyName}</b><br>${this.jobData?.title}`)
          .openPopup();

        setTimeout(() => this.map.invalidateSize(), 200);
      },
      error: (err) => console.error("Error de geocodificación:", err)
    });
  }

  // --- CARGA DE DATOS DESDE API ---
  cargarDetalles(id: string | null) {
    if (!id) {
      this.jobData = null;
      return;
    }

    this.api.obtenerAnunciosPublicos().subscribe({
      next: (anuncios) => {
        const anuncio = anuncios.find((item) => String(item.id_anuncio) === String(id));

        if (!anuncio) {
          this.jobData = this.getFallbackData(id, 'Vacante no disponible');
          return;
        }

        this.jobData = {
          id: anuncio.id_anuncio,
          companyName: anuncio.nombre_empresa || 'Empresa Certificada',
          companyLogo: 'assets/LogoChambee.png',
          companyDesc: anuncio.descripcion_empresa || 'Empresa activa en Chambee.',
          title: anuncio.titulo,
          urgency: anuncio.urgencia || 'Normal',
          edad: anuncio.edad || 'Sin especificar',
          escolaridad: anuncio.educacion || 'Sin especificar',
          experiencia: anuncio.experiencia || 'Sin especificar',
          disponibilidad: anuncio.modalidad || 'Presencial',
          higiene: anuncio.descripcion, 
          salario: anuncio.salario,
          vistas: anuncio.vistas || 0,
          direccion: `${anuncio.calle}, ${anuncio.colonia}, ${anuncio.ciudad}, ${anuncio.estado}, CP: ${anuncio.codigo_postal}`
        };
      },
      error: (err) => {
        console.error("Error al obtener anuncios:", err);
        this.jobData = this.getFallbackData(id, 'Error al cargar datos');
      }
    });
  }

  private getFallbackData(id: string | null, titulo: string) {
    return {
      id,
      companyName: 'Chambee',
      companyLogo: 'assets/LogoChambee.png',
      title: titulo,
      urgency: 'Normal',
      higiene: 'No fue posible cargar los detalles.',
      direccion: 'Ubicación no disponible'
    };
  }

  cargarTrabajosRelacionados() {
    this.relatedJobs = [
      { id: '2001', company: 'Google', title: 'Frontend Developer', salary: '$25,000 MXN', img: 'https://picsum.photos/301/150', rating: '4.8', applicants: 12 },
      { id: '2002', company: 'Amazon', title: 'Backend Developer', salary: '$30,000 MXN', img: 'https://picsum.photos/302/150', rating: '4.7', applicants: 7 },
      { id: '2003', company: 'Spotify', title: 'Mobile Engineer', salary: '$28,000 MXN', img: 'https://picsum.photos/303/150', rating: '4.6', applicants: 5 },
      { id: '2004', company: 'Twitter', title: 'Data Engineer', salary: '$31,000 MXN', img: 'https://picsum.photos/304/150', rating: '4.5', applicants: 9 }
    ];
  }
}