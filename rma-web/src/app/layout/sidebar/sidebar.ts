import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideClipboardList, LucideDatabase, LucideHistory, LucideLayers } from '@lucide/angular';
import { NavItem } from '../navigation';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideLayers, LucideClipboardList, LucideDatabase, LucideHistory],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly items = input.required<NavItem[]>();
}
