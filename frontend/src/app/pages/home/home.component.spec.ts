import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter jobs by the selected category', () => {
    component.jobs = [
      { id: 1, company: 'Empresa A', title: 'Desarrollador', salary: '$10000', img: '', urgency: 'Alta', rating: '5', applicants: 2, tags: ['Tecnología', 'Remoto'], tipoAnuncio: 'Empleo', modalidad: 'Presencial' },
      { id: 2, company: 'Empresa B', title: 'Analista', salary: '$9000', img: '', urgency: 'Media', rating: '4', applicants: 1, tags: ['Administración'], tipoAnuncio: 'Pasantía', modalidad: 'Remoto' }
    ] as any;

    component.seleccionarCategoria('Tecnología');

    expect(component.filteredJobs.length).toBe(1);
    expect(component.filteredJobs[0].title).toBe('Desarrollador');
  });

  it('should filter jobs by the selected type', () => {
    component.jobs = [
      { id: 1, company: 'Empresa A', title: 'Desarrollador', salary: '$10000', img: '', urgency: 'Alta', rating: '5', applicants: 2, tags: ['Tecnología'], tipoAnuncio: 'Empleo', modalidad: 'Presencial' },
      { id: 2, company: 'Empresa B', title: 'Analista', salary: '$9000', img: '', urgency: 'Media', rating: '4', applicants: 1, tags: ['Administración'], tipoAnuncio: 'Pasantía', modalidad: 'Remoto' }
    ] as any;

    component.seleccionarTipo('Pasantía');

    expect(component.filteredJobs.length).toBe(1);
    expect(component.filteredJobs[0].title).toBe('Analista');
  });
});
