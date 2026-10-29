import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { ExpenseListComponent } from './components/expense-list/expense-list';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { ResetPasswordComponent } from './components/reset-password/reset-password';
import { HomeComponent } from './components/home/home';
import { AuthGuard } from './guards/auth-guard';
import { GuestGuard } from './guards/guest-guard';

export const routes: Routes = [
  // Public routes (GuestGuard prevents logged-in users from seeing these)
  { path: '', component: HomeComponent, canActivate: [GuestGuard] }, 
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  
  // Private routes (AuthGuard prevents logged-out users from seeing these)
  { path: 'dashboard', component: ExpenseListComponent, canActivate: [AuthGuard] },
  
  { path: '**', redirectTo: '' }
];