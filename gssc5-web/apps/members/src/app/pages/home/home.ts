import { Component, signal } from '@angular/core';
import { backend } from '../../services/backend';

@Component({
  selector: 'gssc-home-page',
  templateUrl: './home.html',
})
export class HomePage {
  protected readonly backendMessage = signal('…');

  constructor() {
    void backend.get().then(({ data, error }) => {
      this.backendMessage.set(error ? 'Backend unavailable' : String(data));
    });
  }
}
