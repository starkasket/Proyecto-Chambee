import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core'; // <-- Agregamos PLATFORM_ID
import { CommonModule, Location, isPlatformBrowser } from '@angular/common'; // <-- Agregamos isPlatformBrowser
import { ActivatedRoute, Router } from '@angular/router'; 
import { JobCardComponent } from '../../components/job-card/job-card.component';
//import * as L from 'leaflet';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, JobCardComponent], 
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.css'
})
export class JobDetailComponent implements OnInit {
  
  jobId: string | null = null;
  jobData: any = null; 
  relatedJobs: any[] = [];
  
  mostrarMapa: boolean = false;
  private map: any;

  private route = inject(ActivatedRoute);
  private router = inject(Router); 
  private location = inject(Location); 
  private platformId = inject(PLATFORM_ID); // <-- Esto detecta si estás en el navegador

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.jobId = params.get('id');
      this.cargarDetalles(this.jobId);
      this.mostrarMapa = false;
    });
    this.cargarTrabajosRelacionados();
  }

  toggleVerMas(): void {
    this.mostrarMapa = !this.mostrarMapa;

    // isPlatformBrowser evita errores si intentas cargar el mapa en el servidor (Docker/SSR)
    if (this.mostrarMapa && isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initMap();
      }, 100);
    }
  }

  private initMap(): void {
    // Si el mapa ya estaba creado, lo limpiamos para evitar el error "Map already initialized"
    if (this.map) {
      this.map.remove();
    }

    // Coordenadas de Querétaro (como tu ejemplo del Pollo Feliz)
    const lat = 20.5888;
    const lon = -100.3899;

    //this.map = L.map('map').setView([lat, lon], 13);

   /*  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    L.marker([lat, lon]).addTo(this.map)
      .bindPopup('<b>Ubicación del Empleo</b>')
      .openPopup(); */

    // Esto corrige el bug donde el mapa sale gris o incompleto
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
    console.log('Cargando datos reales para el ID:', id);
    
    this.jobData = {
      id: id,
      companyName: id === '1001' ? 'Lucky Ghost' : 'Chambee Tech', 
      companyLogo: 'assets/LogoChambee.png', 
      companyDesc: 'Somos una empresa líder enfocada en el crecimiento profesional y el desarrollo tecnológico.',
      title: id === '1001' ? 'Asesor de Ventas' : 'Backend Developer',
      edad: 'Mayor de 18 años.',
      escolaridad: 'Secundaria terminada / Universidad trunca.',
      experiencia: 'Mínimo 6 meses en puestos similares.',
      disponibilidad: 'Flexibilidad para rotar turnos.',
      higiene: 'Compromiso total con las normas de la empresa.',
      vistas: Math.floor(Math.random() * 1000) 
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