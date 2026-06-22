import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loading = false;
  errorMessage = '';
  successMessage = '';

  registerForm = this.fb.group({
    nom: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    role: ['consultant', [Validators.required]]
  });

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { nom, email, password, confirmPassword, role } =
      this.registerForm.getRawValue();

    if (password !== confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.register({
      nom: nom || '',
      email: email || '',
      password: password || '',
      role: role || 'consultant'
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMessage =
          res?.message ||
          'Votre demande de création de compte a été envoyée. Veuillez attendre la validation de l’administrateur.';

        this.registerForm.reset({
          nom: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'consultant'
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors de la création du compte.';
      }
    });
  }
}