import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { backend } from './backend';

@Component({
  imports: [RouterOutlet],
  selector: 'gssc-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('members');
  protected readonly backendMessage = signal('…');

  constructor() {
    void backend.get().then(({ data, error }) => {
      this.backendMessage.set(error ? 'Backend unavailable' : String(data));
    });
  }
}
