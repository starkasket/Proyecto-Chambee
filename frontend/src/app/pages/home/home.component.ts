import { Component, OnInit } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  currentSlide = 0;

  slides = [
    {
      title: 'Desarrollador Frontend',
      salary: '$20,000 MXN',
      location: 'Ciudad de México',
      mode: 'Remoto',
      description: 'Trabaja con Angular en proyectos modernos.'
    },
    {
      title: 'Backend Developer',
      salary: '$25,000 MXN',
      location: 'Guadalajara',
      mode: 'Híbrido',
      description: 'Desarrollo con Node.js y PostgreSQL.'
    },
    {
      title: 'UI/UX Designer',
      salary: '$18,000 MXN',
      location: 'Monterrey',
      mode: 'Presencial',
      description: 'Diseña experiencias modernas.'
    }
  ];

  ngOnInit() {
    setInterval(() => {
      this.nextSlide();
    }, 4000);
  }

  nextSlide() {
    this.currentSlide =
      (this.currentSlide + 1) % this.slides.length;
  }

  prevSlide() {
    this.currentSlide =
      (this.currentSlide - 1 + this.slides.length)
      % this.slides.length;
  }

  goToSlide(index: number) {
    this.currentSlide = index;
  }
}