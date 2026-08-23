import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter jobs by category using filtros', () => {
    component.jobs = [
      { id: 1, company: 'Empresa A', title: 'Desarrollador', salary: '$10000', img: '', urgency: 'Alta', rating: '5', applicants: 2, tags: ['Tecnología'], tipoAnuncio: 'Empleo', modalidad: 'Remoto' },
      { id: 2, company: 'Empresa B', title: 'Analista', salary: '$9000', img: '', urgency: 'Media', rating: '4', applicants: 1, tags: ['Administración'], tipoAnuncio: 'Pasantía', modalidad: 'Presencial' }
    ] as any;

    component.filtros.categoriaEmpleo = 'Tecnología';
    component.aplicarFiltros();

    expect(component.filteredJobs.length).toBe(1);
    expect(component.filteredJobs[0].title).toBe('Desarrollador');
  });

  it('should filter jobs by modality using filtros', () => {
    component.jobs = [
      { id: 1, company: 'Empresa A', title: 'Desarrollador', salary: '$10000', img: '', urgency: 'Alta', rating: '5', applicants: 2, tags: ['Tecnología'], tipoAnuncio: 'Empleo', modalidad: 'Remoto' },
      { id: 2, company: 'Empresa B', title: 'Analista', salary: '$9000', img: '', urgency: 'Media', rating: '4', applicants: 1, tags: ['Administración'], tipoAnuncio: 'Pasantía', modalidad: 'Presencial' }
    ] as any;

    component.filtros.modalidad = 'Presencial';
    component.aplicarFiltros();

    expect(component.filteredJobs.length).toBe(1);
    expect(component.filteredJobs[0].title).toBe('Analista');
  });
});