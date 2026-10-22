import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ExpenseListComponent } from './components/expense-list/expense-list';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ExpenseListComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('budget-tracker-frontend');
}
