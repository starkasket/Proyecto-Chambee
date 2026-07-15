import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PerfilPostulanteEditarComponent } from './perfil-postulante-editar.component';

describe('PerfilPostulanteEditarComponent', () => {
  let component: PerfilPostulanteEditarComponent;
  let fixture: ComponentFixture<PerfilPostulanteEditarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilPostulanteEditarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PerfilPostulanteEditarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
