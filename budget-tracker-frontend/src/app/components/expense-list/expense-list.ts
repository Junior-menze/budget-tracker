import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseService, Expense, Budget } from '../../services/expense';
import { Chart, registerables, Plugin } from 'chart.js';
import { supabase } from '../../supabase.config';

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
  isLoading = true;
  insightMessage = '';
  budgets: Budget[] = [];
  newBudget: Budget = { category: 'Food', monthlyLimit: 0 };
  isSavingBudget = false;
  editingBudgetId: number | null = null;
  editLimitValue: number = 0;
  showEditModal = false;
  editingExpense: Expense | null = null;
  editReceiptFile: File | null = null;
  isUpdating = false;
  showBudgetDeleteModal = false;
  budgetToDelete: number | null = null;
  isDeletingBudget = false;
  
  // Receipt Upload State
  selectedFile: File | null = null;
  isUploading = false;
  
  searchTerm = '';
  selectedCategory = 'All';
  
  chartLegend: { label: string, value: number, percentage: number, color: string }[] = [];
  
  @ViewChild('expenseChart') expenseChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChart') trendChart!: ElementRef<HTMLCanvasElement>;
  
  chartInstance: Chart | undefined;
  trendChartInstance: Chart | undefined;

  // Added receiptUrl to the initial object
  newExpense: Expense = {
    description: '',
    amount: 0,
    date: new Date().toISOString(),
    category: 'Food',
    userId: '',
    receiptUrl: '',
    isRecurring: false
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

  constructor(private expenseService: ExpenseService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.expenseService.processRecurringExpenses().subscribe({
      next: () => {
        this.loadExpenses();
        this.loadBudgets();
      },
      error: (err) => {
        console.error('Failed to process recurring', err);
        this.loadExpenses();
        this.loadBudgets();
      }
    });
  }

  ngAfterViewInit() {}

  loadExpenses() {
    this.isLoading = true;
    
    this.expenseService.getInsights().subscribe(res => {
      this.insightMessage = res.message;
    });

    this.expenseService.getExpenses(this.searchTerm, this.selectedCategory).subscribe({
      next: (data) => {
        this.expenses = data;
        this.totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        this.isLoading = false; 
        
        this.cdr.detectChanges();

        setTimeout(() => {
          this.updateDoughnutChart();
          this.updateTrendChart();
        }, 0);
      },
      error: (err) => {
        console.error('Failed to load expenses.', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters() {
    this.loadExpenses();
  }

  // --- RECEIPT UPLOAD & ADD EXPENSE LOGIC ---
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  async onSubmit() {
    this.isUploading = true;
    let uploadedUrl = '';

    try {
      // 1. Upload image to Supabase Storage if a file was selected
      if (this.selectedFile) {
        const fileExt = this.selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, this.selectedFile);

        if (uploadError) throw uploadError;

        // 2. Get the public URL
        const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
        uploadedUrl = data.publicUrl;
      }

      // 3. Save the expense with the image URL
      this.newExpense.receiptUrl = uploadedUrl;
      
      this.expenseService.addExpense(this.newExpense).subscribe({
        next: () => {
          this.loadExpenses(); 
          this.newExpense = {
            description: '',
            amount: 0,
            date: new Date().toISOString(),
            category: 'Food',
            userId: '',
            receiptUrl: '',
            isRecurring: false
          };
          this.selectedFile = null; 
          this.isUploading = false;
        },
        error: (err) => {
          console.error(err);
          this.isUploading = false;
        }
      });

    } catch (error) {
      console.error('Upload failed:', error);
      this.isUploading = false;
      alert('Failed to upload receipt.');
    }
  }

  // Opens the modal
  openDeleteBudgetModal(id: number | undefined) {
    if (!id) return;
    this.budgetToDelete = id;
    this.showBudgetDeleteModal = true;
  }

  // Closes the modal
  closeBudgetDeleteModal() {
    this.showBudgetDeleteModal = false;
    this.budgetToDelete = null;
  }

  // Actually deletes the budget
  confirmDeleteBudget() {
    if (!this.budgetToDelete) return;
    this.isDeletingBudget = true;

    this.expenseService.deleteBudget(this.budgetToDelete).subscribe({
      next: () => {
        // Remove it from the UI instantly
        this.budgets = this.budgets.filter(b => b.id !== this.budgetToDelete);
        this.isDeletingBudget = false;
        this.closeBudgetDeleteModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to delete budget', err);
        this.isDeletingBudget = false;
        this.closeBudgetDeleteModal();
        alert('Failed to delete budget. Please try again.');
      }
    });
  }

    get pendingExpenses(): Expense[] {
    return this.expenses.filter(e => e.isPending);
  }

    approvePending(expense: Expense) {
    if (!expense.id) return;
    expense.isPending = false; // Approve it
    
    // If it's approved, it becomes a recurring expense for next time
    expense.isRecurring = true; 

    this.expenseService.updateExpense(expense.id, expense).subscribe(() => {
      this.loadExpenses();
    });
  }

   declinePending(expense: Expense) {
    if (!expense.id) return;
    if (confirm("Are you sure you want to decline this recurring expense?")) {
      this.expenseService.deleteExpense(expense.id).subscribe(() => {
        this.loadExpenses();
      });
    }
  }

  // --- EXPENSE EDIT ---
  openEditModal(expense: Expense) {
    // Create a copy so we don't change the table until saved
    this.editingExpense = { ...expense };
    this.editReceiptFile = null;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingExpense = null;
    this.editReceiptFile = null;
  }

  onEditFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editReceiptFile = file;
    }
  }

  async saveEditedExpense() {
    if (!this.editingExpense || !this.editingExpense.id) return;
    this.isUpdating = true;

    try {
      // 1. If user selected a NEW receipt, upload it first
      if (this.editReceiptFile) {
        const fileExt = this.editReceiptFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error } = await supabase.storage.from('receipts').upload(fileName, this.editReceiptFile);
        if (error) throw error;

        const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
        this.editingExpense.receiptUrl = data.publicUrl;
      }

      // 2. Send the updated data to C# API
      this.expenseService.updateExpense(this.editingExpense.id, this.editingExpense).subscribe({
        next: () => {
          this.isUpdating = false;
          this.closeEditModal();
          this.loadExpenses(); // Refresh table and charts
        },
        error: (err) => {
          console.error(err);
          this.isUpdating = false;
        }
      });

    } catch (error) {
      console.error('Upload failed', error);
      this.isUpdating = false;
    }
  }

  // --- DELETE LOGIC ---
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
        this.modalMessage = 'Failed to delete the expense.';
      }
    });
  }

  closeModal() {
    this.showModal = false;
    this.expenseToDelete = null;
  }

  // --- CHARTS LOGIC ---
  updateDoughnutChart() {
    if (!this.expenseChart || this.expenses.length === 0) return;

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

    if (this.chartInstance) this.chartInstance.destroy();

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
          tooltip: { backgroundColor: '#0f172a', padding: 12, cornerRadius: 8 }
        },
        cutout: '75%'
      },
      plugins: [this.centerTextPlugin]
    });
  }

  updateTrendChart() {
    if (!this.trendChart || this.expenses.length === 0) return;

    const monthlyTotals: Record<string, number> = {};
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyTotals[key] = 0;
    }

    this.expenses.forEach(expense => {
      const date = new Date(expense.date);
      const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (monthlyTotals[key] !== undefined) {
        monthlyTotals[key] += expense.amount;
      }
    });

    const labels = Object.keys(monthlyTotals);
    const dataValues = Object.values(monthlyTotals);

    if (this.trendChartInstance) this.trendChartInstance.destroy();

    this.trendChartInstance = new Chart<'bar'>(this.trendChart.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Monthly Spending (R)',
          data: dataValues,
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          hoverBackgroundColor: '#2563eb'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` R ${(context.parsed.y ?? 0).toFixed(2)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: { color: '#64748b' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748b' }
          }
        }
      }
    });
  }

  // --- BUDGET LOGIC ---
  loadBudgets() {
    this.expenseService.getBudgets().subscribe(data => {
      this.budgets = data;
      this.cdr.detectChanges();
    });
  }
  
  onSaveBudget() {
    if (this.newBudget.monthlyLimit <= 0) return;
    this.isSavingBudget = true;
    
    this.expenseService.saveBudget(this.newBudget).subscribe({
      next: (savedBudget) => {
        const existingIndex = this.budgets.findIndex(b => b.category === savedBudget.category);
        
        if (existingIndex > -1) {
          this.budgets[existingIndex] = savedBudget;
        } else {
          this.budgets = [...this.budgets, savedBudget]; 
        }

        this.newBudget.monthlyLimit = 0;
        this.isSavingBudget = false;
        this.cdr.detectChanges();
        this.loadBudgets(); 
      },
      error: () => {
        this.isSavingBudget = false;
        this.cdr.detectChanges();
      }
    });
  }

  startEditing(budget: Budget) {
    this.editingBudgetId = budget.id!;
    this.editLimitValue = budget.monthlyLimit;
  }

  cancelEditing() {
    this.editingBudgetId = null;
  }

  saveEdit(category: string) {
    if (this.editLimitValue <= 0) return;
    
    const updatedBudget: Budget = { category, monthlyLimit: this.editLimitValue };
    
    this.expenseService.saveBudget(updatedBudget).subscribe({
      next: () => {
        this.editingBudgetId = null;
        this.loadBudgets();
      }
    });
  }

  getSpentThisMonth(category: string): number {
    const now = new Date();
    return this.expenses
      .filter(e => e.category === category && new Date(e.date).getMonth() === now.getMonth() && new Date(e.date).getFullYear() === now.getFullYear())
      .reduce((sum, e) => sum + e.amount, 0);
  }

  getBudgetPercentage(category: string, limit: number): number {
    const spent = this.getSpentThisMonth(category);
    return Math.min((spent / limit) * 100, 100);
  }

    isOverspent(category: string): boolean {
    const budget = this.budgets.find(b => b.category === category);
    if (!budget) return false;
    return this.getSpentThisMonth(category) > budget.monthlyLimit;
  }
}