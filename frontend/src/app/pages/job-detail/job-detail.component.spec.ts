import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { JobDetailComponent } from './job-detail.component';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';

describe('JobDetailComponent', () => {
  let component: JobDetailComponent;
  let fixture: ComponentFixture<JobDetailComponent>;

  const themeServiceMock = {
    toggleTheme: jasmine.createSpy('toggleTheme'),
    isDarkMode: jasmine.createSpy('isDarkMode').and.returnValue(false)
  };

  const apiServiceMock = {
    getUsuario: jasmine.createSpy('getUsuario').and.returnValue({ id: 1, rol: 'postulante' }),
    getMiPerfil: jasmine.createSpy('getMiPerfil').and.returnValue(of({ foto_perfil: '' })),
    obtenerAnunciosPublicos: jasmine.createSpy('obtenerAnunciosPublicos').and.returnValue(of([])),
    obtenerMisEtiquetas: jasmine.createSpy('obtenerMisEtiquetas').and.returnValue(of({ etiquetas: [] })),
    postularAAnuncio: jasmine.createSpy('postularAAnuncio').and.returnValue(of({}))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' }))
          }
        },
        {
          provide: Location,
          useValue: {
            back: jasmine.createSpy('back')
          }
        },
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
