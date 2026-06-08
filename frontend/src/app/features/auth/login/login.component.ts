import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  loginErrorMessage = '';
  forgotPasswordError = '';
  forgotPasswordSuccess = '';
  loading = false;
  forgotLoading = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.loginErrorMessage = '';
    this.forgotPasswordError = '';
    this.forgotPasswordSuccess = '';

    const { email, password, rememberMe } = this.loginForm.getRawValue();

    this.authService.login({
      email: email || '',
      password: password || '',
      rememberMe: !!rememberMe
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.loginErrorMessage =
          err?.error?.message || 'Email ou mot de passe incorrect.';
      }
    });
  }

  onForgotPassword(): void {
    const email = this.loginForm.get('email')?.value?.trim();

    this.forgotPasswordError = '';
    this.forgotPasswordSuccess = '';

    if (!email) {
      this.forgotPasswordError = 'Veuillez saisir votre email.';
      return;
    }

    if (this.loginForm.get('email')?.invalid) {
      this.forgotPasswordError = 'Veuillez saisir un email valide.';
      return;
    }

    this.forgotLoading = true;

    this.authService.forgotPassword(email).subscribe({
      next: (res: any) => {
        this.forgotLoading = false;
        this.forgotPasswordSuccess =
          res?.message || 'Un email de réinitialisation a été envoyé.';
      },
      error: (err) => {
        this.forgotLoading = false;
        this.forgotPasswordError =
          err?.error?.message || 'Erreur lors de l’envoi de l’email.';
      }
    });
  }
}