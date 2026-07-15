import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('AuthInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthInterceptor,
        {
          provide: AuthService,
          useValue: {
            getToken: jasmine.createSpy('getToken').and.returnValue(null),
            logout: jasmine.createSpy('logout')
          }
        },
        {
          provide: Router,
          useValue: {
            navigateByUrl: jasmine.createSpy('navigateByUrl')
          }
        }
      ]
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(AuthInterceptor)).toBeTruthy();
  });
});
