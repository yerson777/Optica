import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaService } from './core/services/pwa.service';
import { OfflineOverlayComponent } from './shared/ui/offline-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OfflineOverlayComponent],
  template: '<router-outlet /><app-offline-overlay />',
  styles: ':host { display: block; min-height: 100dvh; }',
})
export class App {
  private readonly pwa = inject(PwaService);
}
