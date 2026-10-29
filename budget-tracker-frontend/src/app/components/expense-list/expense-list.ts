import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService, Expense } from '../../services/expense';
import { Chart, registerables, Plugin } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-list.html',
  styleUrls: ['./expense-list.scss']
})
export class ExpenseListComponent implements OnInit, AfterViewInit {
  expenses: Expense[] = [];
  totalExpenses: number = 0;
  isLoading = true; // Added loading state
  
  chartLegend: { label: string, value: number, percentage: number, color: string }[] = [];
  
  @ViewChild('expenseChart') expenseChart!: ElementRef<HTMLCanvasElement>;
  chartInstance: Chart | undefined;

  newExpense: Expense = {
    description: '',
    amount: 0,
    date: new Date().toISOString(),
    category: 'Food',
    userId: '' // Backend fills this in securely
  };

  showModal = false;
  modalType: 'confirm' | 'success' | 'error' = 'confirm';
  modalMessage = '';
  expenseToDelete: number | null = null;

  centerTextPlugin: Plugin = {
    id: 'centerText',
    afterDraw: (chart) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      
      ctx.save();
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.font = '500 14px Inter, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Total Spent', centerX, centerY - 15);
      
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`R ${this.totalExpenses.toFixed(2)}`, centerX, centerY + 15);
      
      ctx.restore();
    }
  };

  constructor(private expenseService: ExpenseService) {}

  ngOnInit(): void {
    this.loadExpenses();
  }

  ngAfterViewInit() {}

  loadExpenses() {
    this.isLoading = true;
    this.expenseService.getExpenses().subscribe({
      next: (data) => {
        this.expenses = data;
        this.totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        this.updateChart();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load expenses. API might be rejecting the token.', err);
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    this.expenseService.addExpense(this.newExpense).subscribe({
      next: () => {
        this.loadExpenses(); 
        this.newExpense = {
          description: '',
          amount: 0,
          date: new Date().toISOString(),
          category: 'Food',
          userId: ''
        };
      },
      error: (err) => {
        console.error('Failed to add expense', err);
        alert('Failed to add expense. Please check if you are logged in.');
      }
    });
  }

  openDeleteModal(id: number | undefined) {
    if (!id) return;
    this.expenseToDelete = id;
    this.modalType = 'confirm';
    this.showModal = true;
  }

  confirmDelete() {
    if (!this.expenseToDelete) return;
    
    this.expenseService.deleteExpense(this.expenseToDelete).subscribe({
      next: () => {
        this.modalType = 'success';
        this.modalMessage = 'Expense deleted successfully.';
        this.loadExpenses();
      },
      error: () => {
        this.modalType = 'error';
        this.modalMessage = 'Failed to delete the expense. Please try again.';
      }
    });
  }

  closeModal() {
    this.showModal = false;
    this.expenseToDelete = null;
  }

  updateChart() {
    if (!this.expenseChart) return;

    const categoryTotals = this.expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);
    
    const baseColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1'];

    this.chartLegend = labels.map((label, index) => ({
      label: label,
      value: categoryTotals[label],
      percentage: this.totalExpenses > 0 ? (categoryTotals[label] / this.totalExpenses) * 100 : 0,
      color: baseColors[index % baseColors.length]
    }));

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const ctx = this.expenseChart.nativeElement.getContext('2d');
    const gradients = baseColors.map(color => {
      const gradient = ctx!.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '99');
      return gradient;
    });

    this.chartInstance = new Chart<'doughnut'>(this.expenseChart.nativeElement, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: gradients,
          borderColor: '#ffffff',
          borderWidth: 4,
          hoverOffset: 12,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 20 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { size: 14, family: 'Inter' },
            bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: (context) => ` R ${context.parsed}`
            }
          }
        },
        cutout: '75%'
      },
      plugins: [this.centerTextPlugin]
    });
  }
}