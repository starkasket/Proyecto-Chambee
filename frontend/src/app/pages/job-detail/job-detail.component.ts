import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; // <-- Añadido RouterModule
import { JobCardComponent } from '../../components/job-card/job-card.component';
import { ThemeService } from '../../services/theme.service'; // <-- Añadido ThemeService
import { ApiService } from '../../services/api.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, JobCardComponent], // <-- Añadido RouterModule
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.css'
})
export class JobDetailComponent implements OnInit {
  
  foto_perfil: string = '';

  jobId: string | null = null;
  jobData: any = null; 
  relatedJobs: any[] = [];
  
  mostrarMapa: boolean = false;
  private map: any;

  private route = inject(ActivatedRoute);
  private router = inject(Router); 
  private location = inject(Location); 
  private platformId = inject(PLATFORM_ID);
  private themeService = inject(ThemeService); // <-- Inyectamos el servicio
  private api = inject(ApiService);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.jobId = params.get('id');
      this.cargarDetalles(this.jobId);
      this.mostrarMapa = false;
    });
    this.cargarTrabajosRelacionados();

    const usuario = this.api.getUsuario();

    if (usuario?.id) {
      this.api.getMiPerfil().subscribe({
        next: (perfil: any) => {
          this.foto_perfil = perfil?.foto_perfil || '';
        },
        error: (err) => {
          console.log("No se pudo cargar la foto de perfil:",  err);
          
        }
      })
    }
  }

  // --- LÓGICA DE LA NAVBAR ---
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  irAlPerfil() {
    this.router.navigate(['/perfil-postulante']);
  }
  // ---------------------------

  toggleVerMas(): void {
    this.mostrarMapa = !this.mostrarMapa;

    if (this.mostrarMapa && isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initMap();
      }, 100);
    }
  }

  private initMap(): void {
    if (this.map) {
      this.map.remove();
    }

    // --- FIX PARA EL ICONO DEL MAPA ---
    const iconDefault = L.icon({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;
    // ----------------------------------

    const lat = 20.5888;
    const lon = -100.3899;

    this.map = L.map('map').setView([lat, lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    L.marker([lat, lon]).addTo(this.map)
      .bindPopup('<b>Ubicación del Empleo</b>')
      .openPopup(); 

    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);
  }

  goBack(): void {
    this.location.back();
  }

  verOtroEmpleo(id: string) {
    this.router.navigate(['/job', id]);
  } 

  cargarDetalles(id: string | null) {
    if (!id) {
      this.jobData = null;
      return;
    }

    this.api.obtenerAnunciosPublicos().subscribe({
      next: (anuncios) => {
        const anuncio = anuncios.find((item) => String(item.id_anuncio) === String(id));

        if (!anuncio) {
          this.jobData = {
            id,
            companyName: 'Oferta no encontrada',
            companyLogo: 'assets/LogoChambee.png',
            companyDesc: 'La vacante que buscas ya no está disponible o fue removida.',
            title: 'Vacante no disponible',
            urgency: 'Normal',
            edad: 'Sin especificar.',
            escolaridad: 'Sin especificar.',
            experiencia: 'Sin especificar.',
            disponibilidad: 'Sujeta a la oferta publicada.',
            higiene: 'Según lineamientos de la empresa.',
            vistas: 0
          };
          return;
        }

        this.jobData = {
          id: anuncio.id_anuncio,
          companyName: anuncio.nombre_empresa || 'Empresa',
          companyLogo: 'assets/LogoChambee.png',
          companyDesc: anuncio.descripcion_empresa || 'Empresa activa en Chambee.',
          title: anuncio.titulo,
          urgency: anuncio.urgencia || 'Normal',
          edad: anuncio.edad || 'Sin especificar.',
          escolaridad: anuncio.educacion || 'Sin especificar.',
          experiencia: 'Consulta la descripción del anuncio para conocer la experiencia requerida.',
          disponibilidad: anuncio.modalidad || 'Según la vacante publicada.',
          higiene: anuncio.descripcion || 'Consulta la publicación para conocer más detalles.',
          vistas: anuncio.vistas || 0
        };
      },
      error: () => {
        this.jobData = {
          id,
          companyName: 'Empresa',
          companyLogo: 'assets/LogoChambee.png',
          companyDesc: 'No fue posible cargar los detalles de la vacante.',
          title: 'Vacante',
          urgency: 'Normal',
          edad: 'Sin especificar.',
          escolaridad: 'Sin especificar.',
          experiencia: 'Sin especificar.',
          disponibilidad: 'Sin especificar.',
          higiene: 'Sin especificar.',
          vistas: 0
        };
      }
    });
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
