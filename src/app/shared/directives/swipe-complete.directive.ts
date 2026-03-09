import { Directive, EventEmitter, HostListener, Output, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appSwipeComplete]',
  standalone: true,
})
export class SwipeCompleteDirective {
  @Output() swipeComplete = new EventEmitter<void>();

  private el = inject(ElementRef);
  private startX = 0;
  private currentX = 0;
  private readonly THRESHOLD = 80;

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    this.startX = e.touches[0].clientX;
    this.currentX = this.startX;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    this.currentX = e.touches[0].clientX;
    const deltaX = Math.max(0, this.currentX - this.startX);
    const el = this.el.nativeElement as HTMLElement;
    const progress = Math.min(deltaX / this.THRESHOLD, 1);
    el.style.transform = `translateX(${deltaX * 0.5}px)`;
    el.style.opacity = `${1 - progress * 0.3}`;
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    const deltaX = this.currentX - this.startX;
    const el = this.el.nativeElement as HTMLElement;

    el.style.transition = 'transform 200ms ease, opacity 200ms ease';
    el.style.transform = 'translateX(0)';
    el.style.opacity = '1';

    setTimeout(() => {
      el.style.transition = '';
    }, 200);

    if (deltaX > this.THRESHOLD) {
      this.swipeComplete.emit();
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  }
}
