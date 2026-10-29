import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  loginData = { email: '', password: '' };
  errorMessage = '';
  showPassword = false; // <-- Add this

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword; // <-- Add this
  }

  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: () => this.router.navigate(['/dashboard']), 
      error: () => this.errorMessage = 'Invalid email or password.'
    });
  }
}