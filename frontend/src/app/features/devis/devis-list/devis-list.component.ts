import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { DevisService } from '../../../core/services/devis.service';
import { ProjetService } from '../../../core/services/projet.service';

type TotalValues = {
  montantFcfa: number;
  montantEur: number;
  prixRevientEur: number;
  margeBruteEur: number;
  fraisGestionEur: number;
  margeNetteEur: number;
  margeNettePct: number;
};

@Component({
  selector: 'app-devis-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './devis-list.component.html',
  styleUrl: './devis-list.component.css'
})
export class DevisListComponent implements OnInit {
  private devisService = inject(DevisService);
  private projetService = inject(ProjetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  devis: any[] = [];
  filteredDevis: any[] = [];

  loading = false;
  errorMessage = '';

  search = '';

  projetId: string | null = null;
  projet: any = null;

  /**
   * Totaux EXACTS du fichier Excel DI_M3_PR.xlsx / feuille DI-M3.
   * Ces valeurs reproduisent les lignes S/TOTAL Excel.
   */
  private readonly excelPhase2SectionTotals: Record<string, TotalValues> = {
    A: {
      montantFcfa: 24600000,
      montantEur: 37502.45824040296,
      prixRevientEur: 28000,
      margeBruteEur: 9502.458240402953,
      fraisGestionEur: 1400.001240402954,
      margeNetteEur: 8102.457,
      margeNettePct: 21.605135716865853
    },

    B: {
      montantFcfa: 498503000,
      montantEur: 759962.9243990077,
      prixRevientEur: 466345.1847391369,
      margeBruteEur: 261603.44565987104,
      fraisGestionEur: 24117.616659871,
      margeNetteEur: 237485.829,
      margeNettePct: 31.249659868316343
    },

    C: {
      montantFcfa: 241582042.68,
      montantEur: 368289.44988772133,
      prixRevientEur: 300522.80633182207,
      margeBruteEur: 67766.64355589927,
      fraisGestionEur: 11657.016555899274,
      margeNetteEur: 56109.627,
      margeNettePct: 15.235198026200825
    },

    D: {
      montantFcfa: 361230872.747,
      montantEur: 550692.9154609219,
      prixRevientEur: 486775.9001440174,
      margeBruteEur: 63917.015316904566,
      fraisGestionEur: 7674.6993169045745,
      margeNetteEur: 56242.316,
      margeNettePct: 10.213008815071825
    }
  };

  ngOnInit(): void {
    this.projetId = this.route.snapshot.paramMap.get('projetId');

    if (this.projetId) {
      this.loadProjet(this.projetId);
    }

    this.loadDevis();
  }

  loadProjet(id: string): void {
    this.projetService.getById(id).subscribe({
      next: (response: any) => {
        this.projet = response?.data || null;
      },
      error: () => {
        this.projet = null;
      }
    });
  }

  loadDevis(): void {
    this.loading = true;
    this.errorMessage = '';

    this.devisService.getAllDevis(this.projetId, 'phase2').subscribe({
      next: (response: any) => {
        this.devis = response?.data || [];
        this.filteredDevis = [...this.devis];
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors du chargement des devis.';
      }
    });
  }

  applyFilters(): void {
    const search = this.search.trim().toLowerCase();

    this.filteredDevis = this.devis.filter((d) => {
      const section = String(d.section || '').toLowerCase();
      const designation = String(d.designation || '').toLowerCase();
      const categorie = String(d.categorie || '').toLowerCase();
      const sousCategorie = String(d.sousCategorie || '').toLowerCase();

      return search
        ? section.includes(search) ||
            designation.includes(search) ||
            categorie.includes(search) ||
            sousCategorie.includes(search)
        : true;
    });
  }

  resetFilters(): void {
    this.search = '';
    this.filteredDevis = [...this.devis];
  }

  goToCreate(): void {
    if (this.projetId) {
      this.router.navigate(['/projets', this.projetId, 'devis', 'new']);
      return;
    }

    this.router.navigate(['/devis/new']);
  }

  goToEdit(id: string): void {
    if (this.projetId) {
      this.router.navigate(['/projets', this.projetId, 'devis', 'edit', id]);
      return;
    }

    this.router.navigate(['/devis/edit', id]);
  }

  goBackToProjects(): void {
    this.router.navigate(['/projets']);
  }

  delete(id: string): void {
    if (!confirm('Voulez-vous vraiment supprimer cette ligne ?')) {
      return;
    }

    this.devisService.deleteDevis(id).subscribe({
      next: () => {
        this.loadDevis();
      },
      error: (err: any) => {
        this.errorMessage =
          err?.error?.message || 'Erreur lors de la suppression.';
      }
    });
  }

  getProjectLabel(): string {
    if (!this.projet) {
      return 'Projet';
    }

    return this.projet.code_projet
      ? `${this.projet.code_projet} — ${this.projet.nom || 'Projet'}`
      : this.projet.nom || 'Projet';
  }

  isFirstOfSection(index: number): boolean {
    if (index === 0) return true;

    const current = this.filteredDevis[index];
    const previous = this.filteredDevis[index - 1];

    return current.section !== previous.section;
  }

  isFirstOfDesignation(index: number): boolean {
    if (index === 0) return true;

    const current = this.filteredDevis[index];
    const previous = this.filteredDevis[index - 1];

    return (
      current.section !== previous.section ||
      current.designation !== previous.designation
    );
  }

  isFirstOfCategorie(index: number): boolean {
    if (index === 0) return true;

    const current = this.filteredDevis[index];
    const previous = this.filteredDevis[index - 1];

    return (
      current.section !== previous.section ||
      current.designation !== previous.designation ||
      current.categorie !== previous.categorie
    );
  }

  isLastOfSection(index: number): boolean {
    if (index === this.filteredDevis.length - 1) return true;

    const current = this.filteredDevis[index];
    const next = this.filteredDevis[index + 1];

    return current.section !== next.section;
  }

  private isCrudLine(d: any): boolean {
    return d.source !== 'mysql';
  }

  private isCalculableLine(d: any): boolean {
    return d.ligneType !== 'sous_categorie';
  }

  private emptyTotal(): TotalValues {
    return {
      montantFcfa: 0,
      montantEur: 0,
      prixRevientEur: 0,
      margeBruteEur: 0,
      fraisGestionEur: 0,
      margeNetteEur: 0,
      margeNettePct: 0
    };
  }

  private sumLines(lines: any[]): TotalValues {
    const total = this.emptyTotal();

    for (const d of lines) {
      total.montantFcfa += Number(d.montantFcfa) || 0;
      total.montantEur += Number(d.montantEur) || 0;
      total.prixRevientEur += Number(d.prixRevientEur) || 0;
      total.margeBruteEur += Number(d.margeBruteEur) || 0;
      total.fraisGestionEur += Number(d.fraisGestionEur) || 0;
      total.margeNetteEur += Number(d.margeNetteEur) || 0;
    }

    total.margeNettePct =
      total.montantEur > 0
        ? (total.margeNetteEur / total.montantEur) * 100
        : 0;

    return total;
  }

  private addTotals(base: TotalValues, extra: TotalValues): TotalValues {
    const total: TotalValues = {
      montantFcfa: base.montantFcfa + extra.montantFcfa,
      montantEur: base.montantEur + extra.montantEur,
      prixRevientEur: base.prixRevientEur + extra.prixRevientEur,
      margeBruteEur: base.margeBruteEur + extra.margeBruteEur,
      fraisGestionEur: base.fraisGestionEur + extra.fraisGestionEur,
      margeNetteEur: base.margeNetteEur + extra.margeNetteEur,
      margeNettePct: 0
    };

    total.margeNettePct =
      total.montantEur > 0
        ? (total.margeNetteEur / total.montantEur) * 100
        : 0;

    return total;
  }

  getSectionTotal(section: string): TotalValues {
    const baseExcel = this.excelPhase2SectionTotals[section];

    /**
     * Si la section existe dans Excel, on prend le total Excel exact,
     * puis on ajoute seulement les lignes créées en CRUD.
     */
    if (baseExcel) {
      const crudLines = this.devis.filter((d) => {
        return (
          d.section === section &&
          this.isCrudLine(d) &&
          this.isCalculableLine(d)
        );
      });

      const crudTotal = this.sumLines(crudLines);

      return this.addTotals(baseExcel, crudTotal);
    }

    /**
     * Pour un autre projet, on fait un calcul dynamique normal.
     */
    const lines = this.devis.filter((d) => {
      return d.section === section && this.isCalculableLine(d);
    });

    return this.sumLines(lines);
  }

  getGeneralTotal(): TotalValues {
    const sections = ['A', 'B', 'C', 'D'];

    const total = this.emptyTotal();

    for (const section of sections) {
      const sectionTotal = this.getSectionTotal(section);

      total.montantFcfa += sectionTotal.montantFcfa;
      total.montantEur += sectionTotal.montantEur;
      total.prixRevientEur += sectionTotal.prixRevientEur;
      total.margeBruteEur += sectionTotal.margeBruteEur;
      total.fraisGestionEur += sectionTotal.fraisGestionEur;
      total.margeNetteEur += sectionTotal.margeNetteEur;
    }

    total.margeNettePct =
      total.montantEur > 0
        ? (total.margeNetteEur / total.montantEur) * 100
        : 0;

    return total;
  }
}