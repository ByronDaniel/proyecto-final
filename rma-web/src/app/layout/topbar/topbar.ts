import { Component, inject, input } from '@angular/core';
import { AuthService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  readonly auth = inject(AuthService);
  readonly heading = input.required<string>();
}
