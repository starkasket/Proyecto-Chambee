import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { HomeEmployerComponent } from './home-employer.component';

describe('HomeEmployerComponent', () => {
  let component: HomeEmployerComponent;
  let fixture: ComponentFixture<HomeEmployerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeEmployerComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HomeEmployerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
