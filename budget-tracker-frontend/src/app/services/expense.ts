import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http'

export interface Expense {
  id?: number;
  description: string;
  amount: number;
  date: string;
  category: string;
  userId: string;
  receiptUrl?: string;
  isRecurring?: boolean;
 isPending?: boolean;
  lastProcessedDate?: string;
}

export interface Budget {
  id?: number;
  category: string;
  monthlyLimit: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private apiUrl = 'https://budget-tracker-api-iaaf.onrender.com';

  constructor(private http: HttpClient) { }

   getExpenses(search?: string, category?: string): Observable<Expense[]> {
    let params = new HttpParams();
    if (search) params = params.append('search', search);
    if (category && category !== 'All') params = params.append('category', category);
    
    return this.http.get<Expense[]>(this.apiUrl, { params });
  }

  addExpense(expense: Expense): Observable<Expense> {
    return this.http.post<Expense>(this.apiUrl, expense);
  }

   deleteExpense(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

    getInsights(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/insights`);
  }

    getBudgets(): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${this.apiUrl.replace('/expenses', '/budgets')}`);
  }

  saveBudget(budget: Budget): Observable<Budget> {
    return this.http.post<Budget>(`${this.apiUrl.replace('/expenses', '/budgets')}`, budget);
  }

   processRecurringExpenses(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/process-recurring`, {});
  }

    deleteBudget(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl.replace('/expenses', '/budgets')}/${id}`);
  }

  updateExpense(id: number, expense: Expense): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, expense);
  }
}