import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilPostulanteComponent } from './perfil-postulante.component';

describe('PerfilPostulanteComponent', () => {
  let component: PerfilPostulanteComponent;
  let fixture: ComponentFixture<PerfilPostulanteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilPostulanteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PerfilPostulanteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
