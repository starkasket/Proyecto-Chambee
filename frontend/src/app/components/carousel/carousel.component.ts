import { Component, Input, inject, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.css'
})
export class CarouselComponent {
  // Recibe un arreglo de URLs de imágenes
  @Input() images: string[] = [];
  // Opcional: id de la vacante o recurso para navegar al hacer click
  @Input() jobId?: string | number | null;
  // Autoplay settings
  @Input() autoplay = true;
  @Input() interval = 3000; // ms

  private timer: any;

  private router = inject(Router);
  current = 0;

  ngOnInit(): void {
    this.startTimerIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images']) {
      // Filter out falsy values (null/undefined/empty) to avoid broken <img>
      this.images = (this.images || [])
        .filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
        .map((image) => image.trim());
      this.current = this.images.length ? Math.min(this.current, this.images.length - 1) : 0;
      this.resetTimer();
    }

    if (changes['autoplay'] || changes['interval']) {
      this.resetTimer();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  prev(e?: Event) {
    if (e) e.stopPropagation();
    if (!this.images?.length) return;
    this.current = (this.current - 1 + this.images.length) % this.images.length;
    this.resetTimer();
  }

  next(e?: Event) {
    if (e) e.stopPropagation();
    if (!this.images?.length) return;
    this.current = (this.current + 1) % this.images.length;
    if (e) this.resetTimer();
  }

  goTo(i: number, e?: Event) {
    if (e) e.stopPropagation();
    this.current = i % (this.images?.length || 1);
    this.resetTimer();
  }

  abrirDetalle() {
    if (this.jobId) {
      this.router.navigate(['/job', this.jobId]);
    }
  }

  // Timer helpers
  private startTimerIfNeeded() {
    this.clearTimer();
    if (!this.autoplay) return;
    if (!this.images || this.images.length <= 1) return;
    this.timer = window.setInterval(() => this.next(), Math.max(this.interval, 1000));
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private resetTimer() {
    this.startTimerIfNeeded();
  }

  // Pause / resume used by template hover
  pauseAutoplay() {
    this.clearTimer();
  }

  resumeAutoplay() {
    this.startTimerIfNeeded();
  }
}
