import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; 
import { JobCardComponent } from '../../components/job-card/job-card.component';

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

  private route = inject(ActivatedRoute);
  private router = inject(Router); 
  private location = inject(Location); 

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.jobId = params.get('id');
      this.cargarDetalles(this.jobId);
    });

    this.cargarTrabajosRelacionados();
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