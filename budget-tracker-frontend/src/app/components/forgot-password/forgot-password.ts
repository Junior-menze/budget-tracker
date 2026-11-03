import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html'
})
export class ForgotPasswordComponent {
  email = '';
  message = '';
  isSuccess = false;
  isLoading = false; 

  constructor(private authService: AuthService) {}

  onSubmit() {
    if (!this.email) return;
    
    this.isLoading = true; 
    
    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.isSuccess = true;
        this.isLoading = false;
        this.message = 'If an account exists, a reset link has been sent. Please check your Mailtrap inbox to view the email.';
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 400) {
          this.isSuccess = true; 
          this.message = 'If an account exists, a reset link has been sent. (Note: If testing, please wait a few seconds before trying again).';
        }
      }
    });
  }
}