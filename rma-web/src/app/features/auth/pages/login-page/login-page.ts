import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { errorMessage } from '../../../../shared/utils/error-message';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  busy = false;
  error = '';

  async login() {
    this.busy = true;
    this.error = '';
    try {
      await this.auth.login(this.username, this.password);
      this.password = '';
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
