import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private currentTheme: ThemeMode = 'light';

  constructor() {
    this.currentTheme = this.resolveInitialTheme();
    this.applyTheme(this.currentTheme);
  }

  isDarkMode(): boolean {
    return this.currentTheme === 'dark';
  }

  getTheme(): ThemeMode {
    return this.currentTheme;
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    this.applyTheme(theme);

    try {
      localStorage.setItem('chambee-theme', theme);
    } catch {
      // Ignora errores de almacenamiento en navegadores restringidos.
    }
  }

  private resolveInitialTheme(): ThemeMode {
    try {
      const savedTheme = localStorage.getItem('chambee-theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch {
      // Continúa con la preferencia del sistema si localStorage no está disponible.
    }

    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  private applyTheme(theme: ThemeMode): void {
    const body = this.document.body;

    body.classList.toggle('dark-theme', theme === 'dark');
    body.classList.toggle('light-theme', theme === 'light');
    body.setAttribute('data-theme', theme);
  }
}
