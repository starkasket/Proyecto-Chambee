/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BorradorServicioComponent } from './borrador-servicio.component';

describe('BorradorServicioComponent', () => {
  let component: BorradorServicioComponent;
  let fixture: ComponentFixture<BorradorServicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BorradorServicioComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
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
