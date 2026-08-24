import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { EmployerRegisterComponent } from './employerRegister.component';

describe('EmployerRegisterComponent', () => {
  let component: EmployerRegisterComponent;
  let fixture: ComponentFixture<EmployerRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployerRegisterComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EmployerRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
