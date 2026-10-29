import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  registerData = { email: '', password: '', firstName: '', lastName: '' };
  
  // Modal State
  showModal = false;
  modalType: 'success' | 'error' = 'success';
  modalMessage = '';
  
  isLoading = false;
  showPassword = false;

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onRegister() {
    this.isLoading = true;
    
    this.authService.register(this.registerData).subscribe({
      next: () => {
        this.isLoading = false;
        this.openModal('success', 'Registration successful! You can now log in.');
      },
      error: (err) => {
        this.isLoading = false;
        let errorMsg = 'Registration failed. Please check your details.';
        
        // Extract Identity errors if they exist
        if (err.error && Array.isArray(err.error)) {
          errorMsg = err.error.map((e: any) => e.description).join(' ');
        }
        this.openModal('error', errorMsg);
        console.error(err);
      }
    });
  }

  openModal(type: 'success' | 'error', message: string) {
    this.modalType = type;
    this.modalMessage = message;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    // If it was a success, take them to the login page when they click OK
    if (this.modalType === 'success') {
      this.router.navigate(['/login']);
    }
  }
}