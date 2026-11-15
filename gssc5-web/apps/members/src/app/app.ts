import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './modules/footer/footer';

@Component({
  imports: [RouterOutlet, Footer],
  selector: 'gssc-root',
  // @relation(GSSC-MLLR-2, GSSC-MLLR-3, scope=range_start, role=Implementation)
  host: {
    class: 'min-h-dvh bg-gssc-white text-gssc-black font-sans',
  },
  // @relation(GSSC-MLLR-2, GSSC-MLLR-3, scope=range_end, role=Implementation)
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
