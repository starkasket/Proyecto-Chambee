import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilPostulanteEditarComponent } from './perfil-postulante-editar.component';

describe('PerfilPostulanteEditarComponent', () => {
  let component: PerfilPostulanteEditarComponent;
  let fixture: ComponentFixture<PerfilPostulanteEditarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilPostulanteEditarComponent]
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
