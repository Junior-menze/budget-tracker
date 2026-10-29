import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html'
})
export class ResetPasswordComponent implements OnInit {
  email = '';
  token = '';
  newPassword = '';
  errorMessage = '';

  constructor(private route: ActivatedRoute, private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Read the email and token from the URL
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];
      this.token = params['token'];
    });
  }

  onSubmit() {
    this.authService.resetPassword({ email: this.email, token: this.token, newPassword: this.newPassword }).subscribe({
      next: () => {
        alert('Password reset successfully! Please log in.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.errorMessage = 'Failed to reset password. The link may have expired.';
      }
    });
  }
}