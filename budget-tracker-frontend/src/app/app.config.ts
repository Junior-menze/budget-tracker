import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // <-- Add withInterceptors
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth-interceptor'; // <-- Import your interceptor

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])) // <-- Add this here
  ]
};