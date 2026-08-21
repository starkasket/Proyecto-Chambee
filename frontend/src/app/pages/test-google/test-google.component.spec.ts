import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestGoogleComponent } from './test-google.component';

describe('TestGoogleComponent', () => {
  let component: TestGoogleComponent;
  let fixture: ComponentFixture<TestGoogleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestGoogleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TestGoogleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
