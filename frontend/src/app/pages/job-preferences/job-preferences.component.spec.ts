import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JobPreferencesComponent } from './job-preferences.component';

describe('JobPreferencesComponent', () => {
  let component: JobPreferencesComponent;
  let fixture: ComponentFixture<JobPreferencesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobPreferencesComponent],
      providers: [provideRouter([])] 
    })
    .compileComponents();
      
    fixture = TestBed.createComponent(JobPreferencesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});