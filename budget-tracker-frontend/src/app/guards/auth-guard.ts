import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    // If logged in, allow access
    if (this.authService.isLoggedIn()) {
      return true;
    }
    // If NOT logged in, redirect to login page
    this.router.navigate(['/login']);
    return false;
  }
}