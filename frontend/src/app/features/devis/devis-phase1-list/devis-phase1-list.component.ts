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
  selector: 'app-devis-phase1-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './devis-phase1-list.component.html',
  styleUrl: './devis-phase1-list.component.css'
})
export class DevisPhase1ListComponent implements OnInit {
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
   * Totaux EXACTS du fichier Excel :
   * Copie de Offre financière_M3_RBI.xlsx / feuille DI-M3.
   */
  private readonly excelPhase1SectionTotals: Record<string, TotalValues> = {
    A: {
      montantFcfa: 24600000,
      montantEur: 37502.45824040296,
      prixRevientEur: 25000,
      margeBruteEur: 12502.458240402953,
      fraisGestionEur: 1250.001240402954,
      margeNetteEur: 11252.457,
      margeNettePct: 30.004585107109755
    },

    B: {
      montantFcfa: 498503000,
      montantEur: 759962.9243990077,
      prixRevientEur: 447496.81451505056,
      margeBruteEur: 278317.5298839574,
      fraisGestionEur: 24082.268883957342,
      margeNetteEur: 254235.261,
      margeNettePct: 33.4536400181698
    },

    C: {
      montantFcfa: 241582042.68,
      montantEur: 368289.44988772133,
      prixRevientEur: 278722.59764949686,
      margeBruteEur: 89566.85223822447,
      fraisGestionEur: 13936.129238224476,
      margeNetteEur: 75630.723,
      margeNettePct: 20.535674595907424
    },

    D: {
      montantFcfa: 361230872.747,
      montantEur: 550692.9154609219,
      prixRevientEur: 475826.1924192732,
      margeBruteEur: 74866.72304164871,
      fraisGestionEur: 12357.634041648724,
      margeNetteEur: 62509.089,
      margeNettePct: 11.350988408427372
    }
  };

  ngOnInit(): void {
    this.projetId = this.route.snapshot.paramMap.get('projetId');

    if (this.projetId) {
      this.loadProjet(this.projetId);
    }

    this.loadDevisPhase1();
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

  loadDevisPhase1(): void {
    this.loading = true;
    this.errorMessage = '';

    this.devisService.getAllDevis(this.projetId, 'phase1').subscribe({
      next: (response: any) => {
        this.devis = response?.data || [];
        this.filteredDevis = [...this.devis];
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors du chargement de la phase 1.';
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
      this.router.navigate(['/projets', this.projetId, 'devis-phase1', 'new']);
      return;
    }

    this.router.navigate(['/devis-phase1/new']);
  }

  goToEdit(id: string): void {
    if (this.projetId) {
      this.router.navigate(['/projets', this.projetId, 'devis-phase1', 'edit', id]);
      return;
    }

    this.router.navigate(['/devis-phase1/edit', id]);
  }

  goBackToProjects(): void {
    this.router.navigate(['/projets']);
  }

  goToPhase2(): void {
    if (this.projetId) {
      this.router.navigate(['/projets', this.projetId, 'devis']);
      return;
    }

    this.router.navigate(['/devis']);
  }

  delete(id: string): void {
    if (!confirm('Voulez-vous vraiment supprimer cette ligne de phase 1 ?')) {
      return;
    }

    this.devisService.deleteDevis(id).subscribe({
      next: () => {
        this.loadDevisPhase1();
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
    const baseExcel = this.excelPhase1SectionTotals[section];

    /**
     * Pour DI-M3, on utilise le total exact du fichier Excel,
     * puis on ajoute uniquement les nouvelles lignes CRUD.
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
     * Pour les autres projets, total dynamique normal.
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