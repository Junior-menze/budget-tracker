import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService, Expense } from '../../services/expense';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-list.html',
  styleUrls: ['./expense-list.scss']
})
export class ExpenseListComponent implements OnInit {
  expenses: Expense[] = [];
  
  newExpense: Expense = {
    description: '',
    amount: 0,
    date: new Date().toISOString(),
    category: 'Food',
    userId: 'test-user-123'
  };

  constructor(private expenseService: ExpenseService) {}

  ngOnInit(): void {
    this.loadExpenses();
  }

  loadExpenses() {
    this.expenseService.getExpenses().subscribe(data => {
      this.expenses = data;
    });
  }

  onSubmit() {
    this.expenseService.addExpense(this.newExpense).subscribe(() => {
      this.loadExpenses(); 
      this.newExpense = {
        description: '',
        amount: 0,
        date: new Date().toISOString(),
        category: 'Food',
        userId: 'test-user-123'
      };
    });
  }
}