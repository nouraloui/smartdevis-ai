import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { DashboardService } from '../../../core/services/dashboard.service';

type DashboardPage = 'global' | 'finance' | 'sections' | 'alertes' | 'couts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  loading = false;
  errorMessage = '';

  activePage: DashboardPage = 'global';

  projets = [
    { label: 'DI-M3', value: 'DI-M3' },
    { label: 'DI', value: 'DI' }
  ];

  codeProjet = 'DI-M3';

  kpis: any = {};
  sections: any[] = [];
  categories: any[] = [];
  historique: any[] = [];
  alertes: any[] = [];

  couts: any = {
    kpis: {},
    lignes: [],
    topCouts: []
  };

  selectedSection: any = null;
  selectedCategories: any[] = [];

  maxMontant = 1;
  maxMarge = 1;
  maxCategorieMontant = 1;

  categoryChartLimit = 5;
  costChartLimit = 5;

  categoryLimitOptions = [
    { label: 'Top 5', value: 5 },
    { label: 'Top 8', value: 8 },
    { label: 'Top 10', value: 10 },
    { label: 'Toutes', value: 999 }
  ];

  costLimitOptions = [
    { label: 'Top 5', value: 5 },
    { label: 'Top 8', value: 8 },
    { label: 'Top 10', value: 10 },
    { label: 'Top 15', value: 15 },
    { label: 'Top 25', value: 25 }
  ];

  pages = [
    { key: 'global' as DashboardPage, title: 'Vue globale', icon: '📊', description: 'Synthèse générale' },
    { key: 'finance' as DashboardPage, title: 'Performance financière', icon: '💰', description: 'Montants et marges' },
    { key: 'sections' as DashboardPage, title: 'Sections & catégories', icon: '🧩', description: 'Drill-down métier' },
    { key: 'alertes' as DashboardPage, title: 'Alertes IA', icon: '⚠️', description: 'Anomalies et actions' },
    { key: 'couts' as DashboardPage, title: 'Coûts & marges', icon: '📈', description: 'Analyse dim_cout' }
  ];

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 14,
          font: {
            size: 11
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 35,
          minRotation: 0,
          font: {
            size: 10
          }
        }
      },
      y: {
        ticks: {
          font: {
            size: 10
          }
        }
      }
    }
  };

  doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 14,
          font: {
            size: 11
          }
        }
      }
    }
  };

  radarOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 14,
          font: {
            size: 11
          }
        }
      }
    }
  };

  marginChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  amountChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  pieChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
  anomalyChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  categoryAmountChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  categoryMarginChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  radarChartData: ChartConfiguration<'radar'>['data'] = { labels: [], datasets: [] };
  costBreakdownChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
  marginCostChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  costEvolutionChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  ngOnInit(): void {
    this.loadDashboard();
  }

  onProjetChange(): void {
    if (this.codeProjet !== 'DI-M3' && this.activePage === 'couts') {
      this.activePage = 'global';
    }

    this.clearDrillDown();
    this.loadDashboard();
  }

  setActivePage(page: DashboardPage): void {
    if (page === 'couts' && this.codeProjet !== 'DI-M3') {
      this.activePage = 'global';
      return;
    }

    this.activePage = page;
    this.clearDrillDown();
  }

  onCategoryLimitChange(): void {
    this.buildCharts();
  }

  onCostLimitChange(): void {
    this.buildCharts();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dashboardService.getStats(this.codeProjet).subscribe({
      next: (response) => {
        const data = response?.data || {};

        this.kpis = data.kpis || {};
        this.sections = data.sections || [];
        this.categories = data.categories || [];
        this.historique = data.historique || [];
        this.alertes = data.alertes || [];

        this.couts = data.couts || {
          kpis: {},
          lignes: [],
          topCouts: []
        };

        this.maxMontant = Math.max(
          ...this.sections.map((s) => Number(s.montantFcfa) || 0),
          1
        );

        this.maxMarge = Math.max(
          ...this.sections.map((s) => Math.abs(Number(s.margeMoyenne) || 0)),
          1
        );

        this.maxCategorieMontant = Math.max(
          ...this.categories.map((c) => Number(c.montantFcfa) || 0),
          1
        );

        this.clearDrillDown();
        this.buildCharts();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors du chargement du dashboard.';
      }
    });
  }

  private shortenLabel(value: any, maxLength = 24): string {
    const text = String(value || 'Non définie');

    if (text.length <= maxLength) {
      return text;
    }

    return text.slice(0, maxLength) + '...';
  }

  private getFilteredCategories(): any[] {
    const sorted = [...this.categories].sort(
      (a, b) => Number(b.montantFcfa || 0) - Number(a.montantFcfa || 0)
    );

    if (this.categoryChartLimit === 999) {
      return sorted;
    }

    return sorted.slice(0, this.categoryChartLimit);
  }

  private getFilteredCostLines(): any[] {
    return (this.couts?.lignes || [])
      .filter((c: any) => {
        const prixRevient = Number(c.prixRevientTotalEur) || 0;
        const coutFinal = Number(c.coutFinalDt) || 0;
        const margeBrute = Number(c.margeBruteEur) || 0;
        const margeNette = Number(c.margeNetteEur) || 0;

        return (
          prixRevient > 0 ||
          coutFinal > 0 ||
          Math.abs(margeBrute) > 0 ||
          Math.abs(margeNette) > 0
        );
      })
      .sort((a: any, b: any) => {
        const aValue = Number(a.prixRevientTotalEur) || Number(a.coutFinalDt) || 0;
        const bValue = Number(b.prixRevientTotalEur) || Number(b.coutFinalDt) || 0;

        return bValue - aValue;
      })
      .slice(0, this.costChartLimit);
  }

  buildCharts(): void {
    const labels = this.sections.map((s) => `Section ${s.section}`);

    const filteredCategories = this.getFilteredCategories();

    const categoryLabels = filteredCategories.map((c) =>
      this.shortenLabel(c.categorie, 22)
    );

    const red = '#c7352e';
    const darkRed = '#9f241f';
    const gray = '#6f6a6d';
    const dark = '#0f172a';
    const lightGray = '#b8b3b5';

    this.marginChartData = {
      labels,
      datasets: [
        {
          label: 'Marge moyenne (%)',
          data: this.sections.map((s) => Number(s.margeMoyenne) || 0),
          tension: 0.4,
          fill: true,
          borderColor: red,
          backgroundColor: 'rgba(199, 53, 46, 0.12)',
          pointBackgroundColor: darkRed,
          pointBorderColor: darkRed
        }
      ]
    };

    this.amountChartData = {
      labels,
      datasets: [
        {
          label: 'Montant actuel FCFA',
          data: this.sections.map((s) => Number(s.montantFcfa) || 0),
          backgroundColor: red,
          borderColor: darkRed
        },
        {
          label: 'Historique FCFA',
          data: this.sections.map((s) => {
            const h = this.historique.find((item) => item.section === s.section);
            return Number(h?.montantHistorique) || 0;
          }),
          backgroundColor: gray,
          borderColor: dark
        }
      ]
    };

    this.pieChartData = {
      labels,
      datasets: [
        {
          data: this.sections.map((s) => Number(s.montantFcfa) || 0),
          backgroundColor: [red, gray, darkRed, dark, lightGray]
        }
      ]
    };

    this.anomalyChartData = {
      labels,
      datasets: [
        {
          label: 'Anomalies',
          data: this.sections.map((s) => Number(s.anomalies) || 0),
          backgroundColor: darkRed,
          borderColor: red
        }
      ]
    };

    this.categoryAmountChartData = {
      labels: categoryLabels,
      datasets: [
        {
          label: 'Montant par catégorie FCFA',
          data: filteredCategories.map((c) => Number(c.montantFcfa) || 0),
          backgroundColor: red,
          borderColor: darkRed
        }
      ]
    };

    this.categoryMarginChartData = {
      labels: categoryLabels,
      datasets: [
        {
          label: 'Marge moyenne catégorie (%)',
          data: filteredCategories.map((c) => Number(c.margeMoyenne) || 0),
          tension: 0.35,
          fill: true,
          borderColor: dark,
          backgroundColor: 'rgba(15, 23, 42, 0.10)',
          pointBackgroundColor: red,
          pointBorderColor: red
        }
      ]
    };

    this.radarChartData = {
      labels: ['Rentabilité', 'Volume', 'Qualité', 'Maîtrise risque', 'Couverture'],
      datasets: [
        {
          label: `Score ${this.codeProjet}`,
          data: [
            this.getHealthScore(),
            this.getVolumeScore(),
            this.getQualityScore(),
            100 - this.getAnomalyRate(),
            this.getCoverageScore()
          ],
          borderColor: red,
          backgroundColor: 'rgba(199, 53, 46, 0.18)',
          pointBackgroundColor: darkRed
        }
      ]
    };

    const filteredCosts = this.getFilteredCostLines();

    const coutLabels = filteredCosts.map((c: any) => {
      if (c.designation) {
        return this.shortenLabel(c.designation, 22);
      }

      return `Coût ${c.idCout}`;
    });

    this.costBreakdownChartData = {
      labels: ['Prix revient total EUR', 'Coût FG DT', 'Marge sous-traitant DT'],
      datasets: [
        {
          data: [
            Number(this.couts?.kpis?.prixRevientTotalEur) || 0,
            Number(this.couts?.kpis?.coutFgTotalDt) || 0,
            filteredCosts.reduce(
              (sum: number, c: any) =>
                sum + Math.abs(Number(c.margeSousTraitantDt) || 0),
              0
            )
          ],
          backgroundColor: [red, gray, dark]
        }
      ]
    };

    this.marginCostChartData = {
      labels: coutLabels,
      datasets: [
        {
          label: 'Marge brute EUR',
          data: filteredCosts.map((c: any) => Number(c.margeBruteEur) || 0),
          backgroundColor: gray
        },
        {
          label: 'Marge nette EUR',
          data: filteredCosts.map((c: any) => Number(c.margeNetteEur) || 0),
          backgroundColor: red
        }
      ]
    };

    this.costEvolutionChartData = {
      labels: coutLabels,
      datasets: [
        {
          label: 'Coût final DT',
          data: filteredCosts.map((c: any) => Number(c.coutFinalDt) || 0),
          tension: 0.35,
          fill: true,
          borderColor: red,
          backgroundColor: 'rgba(199, 53, 46, 0.12)',
          pointBackgroundColor: red
        },
        {
          label: 'Prix revient total EUR',
          data: filteredCosts.map((c: any) => Number(c.prixRevientTotalEur) || 0),
          tension: 0.35,
          fill: true,
          borderColor: dark,
          backgroundColor: 'rgba(15, 23, 42, 0.10)',
          pointBackgroundColor: dark
        }
      ]
    };
  }

  getBarWidth(value: number, max: number): number {
    if (!value || !max) return 0;
    return Math.min((Math.abs(value) / max) * 100, 100);
  }

  selectSection(section: any): void {
    this.selectedSection = section;
    this.selectedCategories = this.categories.filter(
      (c) => c.section === section.section
    );
  }

  clearDrillDown(): void {
    this.selectedSection = null;
    this.selectedCategories = [];
  }

  getMargeClass(value: number): string {
    if (value < 5) return 'danger-text';
    if (value < 10) return 'warning-text';
    return 'success-text';
  }

  getRentabilityStatus(): string {
    const marge = Number(this.kpis?.margeNetteMoyenne) || 0;

    if (marge < 5) return 'Risque élevé';
    if (marge < 10) return 'À surveiller';
    return 'Bonne rentabilité';
  }

  getRiskLevel(): string {
    const anomalies = Number(this.kpis?.nombreAnomalies) || 0;

    if (anomalies === 0) return 'Faible';
    if (anomalies <= 3) return 'Moyen';
    return 'Élevé';
  }

  getAnomalyRate(): number {
    const total = Number(this.kpis?.totalLignes) || 0;
    const anomalies = Number(this.kpis?.nombreAnomalies) || 0;

    return total > 0 ? Math.round((anomalies / total) * 100) : 0;
  }

  getHealthScore(): number {
    const marge = Number(this.kpis?.margeNetteMoyenne) || 0;
    const anomalyRate = this.getAnomalyRate();

    let score = 50;

    if (marge >= 15) score += 35;
    else if (marge >= 10) score += 25;
    else if (marge >= 5) score += 10;
    else score -= 10;

    score -= anomalyRate;

    return Math.max(0, Math.min(Math.round(score), 100));
  }

  getVolumeScore(): number {
    const total = Number(this.kpis?.totalLignes) || 0;
    return Math.min(total * 2, 100);
  }

  getQualityScore(): number {
    return Math.max(0, 100 - this.getAnomalyRate());
  }

  getCoverageScore(): number {
    return Math.min(this.sections.length * 25, 100);
  }

  getTotalHistorique(): number {
    return this.historique.reduce(
      (sum, h) => sum + Number(h.montantHistorique || 0),
      0
    );
  }

  getEvolutionGlobale(): number {
    const actuel = Number(this.kpis?.montantTotalFcfa) || 0;
    const hist = this.getTotalHistorique();

    if (hist === 0) return 0;

    return ((actuel - hist) / hist) * 100;
  }

  getTopCategories(): any[] {
    return [...this.categories]
      .sort((a, b) => Number(b.montantFcfa || 0) - Number(a.montantFcfa || 0))
      .slice(0, 5);
  }

  getCriticalAlerts(): any[] {
    return this.alertes.filter(
      (a) => a.niveau === 'Critique' || a.niveau === 'Élevé'
    );
  }

  getCostHealthStatus(): string {
    const marge = Number(this.couts?.kpis?.margeNettePctMoyenne) || 0;

    if (marge < 0.05) return 'Rentabilité faible';
    if (marge < 0.15) return 'Rentabilité moyenne';
    return 'Bonne rentabilité';
  }

  getCostHealthClass(): string {
    const marge = Number(this.couts?.kpis?.margeNettePctMoyenne) || 0;

    if (marge < 0.05) return 'danger-text';
    if (marge < 0.15) return 'warning-text';
    return 'success-text';
  }

  getVisibleTopCouts(): any[] {
    return (this.couts?.topCouts || [])
      .filter((c: any) => {
        return (
          Number(c.coutFinalDt) > 0 ||
          Number(c.prixRevientTotalEur) > 0 ||
          Math.abs(Number(c.margeNetteEur) || 0) > 0
        );
      })
      .slice(0, 10);
  }

  exportPDF(): void {
    const element = document.getElementById('dashboard-content');

    if (!element) return;

    html2canvas(element, {
      scale: 2,
      useCORS: true
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 190;
      const pageHeight = 295;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`dashboard-${this.codeProjet}.pdf`);
    });
  }

  get visiblePages() {
    return this.codeProjet === 'DI-M3'
      ? this.pages
      : this.pages.filter((p) => p.key !== 'couts');
  }
}