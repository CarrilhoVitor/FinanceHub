import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  type: TransactionType;
  description: string;
  category: string;
  amount: number;
  date: string;
}

const STORAGE_KEY = 'financehub-transactions';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home {
  protected description = '';
  protected amount: number | null = null;
  protected category = 'Salário';
  protected type: TransactionType = 'income';
  protected isModalOpen = false;

  protected readonly entries = signal<Transaction[]>(this.loadEntries());
  protected readonly totalIncome = computed(() =>
    this.entries()
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0)
  );
  protected readonly totalExpense = computed(() =>
    this.entries()
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0)
  );
  protected readonly balance = computed(() => this.totalIncome() - this.totalExpense());
  protected selectedMonth = signal(this.getMonthKey(new Date()));

  protected readonly monthOptions = computed(() => {
    const now = new Date();
    const currentMonth = this.getMonthKey(now);
    const previousMonth = this.getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    return [
      { value: previousMonth, label: this.formatMonthLabel(previousMonth) },
      { value: currentMonth, label: this.formatMonthLabel(currentMonth) },
    ];
  });

  protected readonly filteredEntriesByMonth = computed(() =>
    this.entries().filter((entry) => this.entryMonth(entry) === this.selectedMonth())
  );

  protected readonly monthIncome = computed(() =>
    this.filteredEntriesByMonth()
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0)
  );

  protected readonly monthExpense = computed(() =>
    this.filteredEntriesByMonth()
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0)
  );

  protected readonly monthBalance = computed(() => this.monthIncome() - this.monthExpense());

  protected readonly monthChartBackground = computed(() => {
    const income = this.monthIncome();
    const expense = this.monthExpense();

    if (income === 0 && expense === 0) {
      return 'linear-gradient(180deg, #0f1b2b, #08101f)';
    }

    const expensePercent = Math.round((expense / Math.max(income + expense, 1)) * 100);
    const incomePercent = 100 - expensePercent;
    return `conic-gradient(#79d5ae 0 ${incomePercent}%, #ff8a66 ${incomePercent}% 100%)`;
  });

  protected readonly essentialCategories = [
    'Moradia',
    'Alimentação',
    'Transporte',
    'Saúde',
    'Educação',
    'Lazer',
    'Outros',
  ];

  protected readonly categorySummary = computed(() => {
    const totals = new Map<string, number>(
      this.essentialCategories.map((category) => [category, 0])
    );

    this.entries().forEach((entry) => {
      if (entry.type !== 'expense') {
        return;
      }

      const categoryKey = this.essentialCategories.includes(entry.category)
        ? entry.category
        : 'Outros';

      totals.set(categoryKey, (totals.get(categoryKey) ?? 0) + entry.amount);
    });

    return Array.from(totals.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));
  });

  constructor() {
    effect(() => {
      if (typeof window === 'undefined' || !('localStorage' in window)) {
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()));
    });
  }

  protected addTransaction() {
    if (!this.description.trim() || !this.amount || this.amount <= 0) {
      return;
    }

    const transaction: Transaction = {
      id: Date.now(),
      type: this.type,
      description: this.description.trim(),
      category: this.category,
      amount: this.amount,
      date: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }),
    };

    this.entries.update((current) => [transaction, ...current]);
    this.description = '';
    this.amount = null;
    this.category = 'Salário';
    this.type = 'income';
  }

  protected removeTransaction(id: number) {
    this.entries.update((current) => current.filter((entry) => entry.id !== id));
  }

  protected openModal() {
    this.isModalOpen = true;
  }

  protected closeModal() {
    this.isModalOpen = false;
  }

  protected deleteMonthEntries() {
    const monthLabel = this.formatMonthLabel(this.selectedMonth());
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Tem certeza que deseja deletar todas as operações de ${monthLabel}? Esta ação não pode ser desfeita.`)
      : false;

    if (!confirmed) {
      return;
    }

    this.entries.update((current) =>
      current.filter((entry) => this.entryMonth(entry) !== this.selectedMonth())
    );
  }

  private getMonthKey(date: Date): string {
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
  }

  private formatMonthLabel(key: string): string {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const [month, year] = key.split('/');
    return `${months[Number(month) - 1]}/${year}`;
  }

  private entryMonth(entry: Transaction): string {
    const [day, month, year] = entry.date.split('/');
    return `${month}/${year}`;
  }

  private loadEntries(): Transaction[] {
    try {
      if (typeof window === 'undefined' || !('localStorage' in window)) {
        return [];
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Transaction[]) : [];
    } catch {
      return [];
    }
  }
}

