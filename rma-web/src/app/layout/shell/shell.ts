import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';
import { NAV_ITEMS } from '../navigation';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

/** Authenticated layout. Sends the user back to the login page as soon as the session ends. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Topbar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly navItems = computed(() => NAV_ITEMS.filter((item) => this.auth.hasRole(...item.roles)));
  readonly title = computed(
    () => this.navItems().find((item) => this.url().startsWith(`/${item.path}`))?.label ?? '',
  );

  constructor() {
    effect(() => {
      if (!this.auth.session()) void this.router.navigateByUrl('/login');
    });
  }
}
