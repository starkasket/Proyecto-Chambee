import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BorradorServicioComponent } from './borrador-servicio.component';

describe('BorradorServicioComponent', () => {
  let component: BorradorServicioComponent;
  let fixture: ComponentFixture<BorradorServicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BorradorServicioComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BorradorServicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
