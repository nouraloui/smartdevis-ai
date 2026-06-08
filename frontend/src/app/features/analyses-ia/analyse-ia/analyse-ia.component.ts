import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IaService } from '../../../core/services/ia.service';

@Component({
  selector: 'app-analyse-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analyse-ia.component.html',
  styleUrl: './analyse-ia.component.css'
})
export class AnalyseIaComponent {
  private iaService = inject(IaService);

  projets = [
    { value: 'ALL', label: 'Toutes les données' },
    { value: 'DI-M3', label: 'DI-M3' },
    { value: 'DI', label: 'DI' }
  ];

  codeProjet = 'ALL';

  puFcfa: number | null = null;
  quantite: number = 1;
  prixRevientFcfa: number | null = null;
  fraisGestionPct: number = 5;
  margeNettePct: number = 0;
  categorieCode: number = 1;

  loadingAnomaly = false;
  loadingRisk = false;
  loadingSuggestion = false;
  loadingMargin = false;

  anomalyResult: any = null;
  riskResult: any = null;
  suggestionResult: any = null;
  marginResult: any = null;

  errorMessage = '';

  get montantFcfa(): number {
    return (this.puFcfa || 0) * (this.quantite || 0);
  }

  checkProjetSelected(): boolean {
    if (!this.codeProjet || this.codeProjet === 'ALL') {
      this.errorMessage =
        'Veuillez choisir un projet précis avant de lancer l’analyse IA.';

      this.anomalyResult = null;
      this.riskResult = null;
      this.suggestionResult = null;
      this.marginResult = null;

      return false;
    }

    return true;
  }

  detectAnomaly(): void {
    if (!this.checkProjetSelected()) return;

    if (!this.puFcfa || this.puFcfa <= 0) {
      this.errorMessage = 'Veuillez saisir un PU FCFA valide.';
      return;
    }

    this.loadingAnomaly = true;
    this.anomalyResult = null;
    this.errorMessage = '';

    this.iaService.detectAnomaly({
      pu_fcfa: this.puFcfa,
      quantite: this.quantite,
      montant_fcfa: this.montantFcfa,
      code_projet: this.codeProjet
    } as any).subscribe({
      next: (response) => {
        this.anomalyResult = response?.data || response;
        this.loadingAnomaly = false;
      },
      error: (err) => {
        this.loadingAnomaly = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors de la détection d’anomalie.';
      }
    });
  }

  calculateRiskScore(): void {
    if (!this.checkProjetSelected()) return;

    if (!this.puFcfa || this.puFcfa <= 0) {
      this.errorMessage = 'Veuillez saisir un PU FCFA valide.';
      return;
    }

    this.loadingRisk = true;
    this.riskResult = null;
    this.errorMessage = '';

    this.iaService.riskScore({
      pu_fcfa: this.puFcfa,
      quantite: this.quantite,
      montant_fcfa: this.montantFcfa,
      prix_revient_fcfa: this.prixRevientFcfa || 0,
      frais_gestion_pct: this.fraisGestionPct || 0,
      marge_nette_pct: this.margeNettePct || 0,
      categorie_code: this.categorieCode || 1,
      code_projet: this.codeProjet
    } as any).subscribe({
      next: (response) => {
        this.riskResult = response?.data || response;
        this.loadingRisk = false;
      },
      error: (err) => {
        this.loadingRisk = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors du calcul du score de risque.';
      }
    });
  }

  suggestValues(): void {
    if (!this.checkProjetSelected()) return;

    if (!this.quantite || this.quantite <= 0) {
      this.errorMessage = 'Veuillez saisir une quantité valide.';
      return;
    }

    if (!this.prixRevientFcfa || this.prixRevientFcfa <= 0) {
      this.errorMessage = 'Veuillez saisir un prix de revient valide.';
      return;
    }

    this.loadingSuggestion = true;
    this.suggestionResult = null;
    this.errorMessage = '';

    this.iaService.suggestValues({
      quantite: this.quantite,
      prix_revient_fcfa: this.prixRevientFcfa,
      categorie_code: this.categorieCode || 1,
      code_projet: this.codeProjet
    } as any).subscribe({
      next: (response) => {
        this.suggestionResult = response?.data || response;
        this.loadingSuggestion = false;
      },
      error: (err) => {
        this.loadingSuggestion = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors de la suggestion IA.';
      }
    });
  }

  predictMargin(): void {
    if (!this.checkProjetSelected()) return;

    if (!this.puFcfa || this.puFcfa <= 0) {
      this.errorMessage = 'Veuillez saisir un PU FCFA valide.';
      return;
    }

    if (!this.prixRevientFcfa || this.prixRevientFcfa <= 0) {
      this.errorMessage = 'Veuillez saisir un prix de revient valide.';
      return;
    }

    this.loadingMargin = true;
    this.marginResult = null;
    this.errorMessage = '';

    this.iaService.predictMargin({
      pu_fcfa: this.puFcfa,
      quantite: this.quantite,
      prix_revient_fcfa: this.prixRevientFcfa,
      frais_gestion_pct: this.fraisGestionPct || 5,
      categorie_code: this.categorieCode || 1,
      code_projet: this.codeProjet
    } as any).subscribe({
      next: (response) => {
        const data = response?.data || response || {};

        this.marginResult = {
          ...data,
          score_confiance:
            data.score_confiance ??
            data.score_confiance_pct ??
            data.confidence ??
            data.confidence_score ??
            data.score ??
            75
        };

        this.loadingMargin = false;
      },
      error: (err) => {
        this.loadingMargin = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors de la prédiction de marge.';
      }
    });
  }

  reset(): void {
    this.codeProjet = 'ALL';

    this.puFcfa = null;
    this.quantite = 1;
    this.prixRevientFcfa = null;
    this.fraisGestionPct = 5;
    this.margeNettePct = 0;
    this.categorieCode = 1;

    this.anomalyResult = null;
    this.riskResult = null;
    this.suggestionResult = null;
    this.marginResult = null;

    this.errorMessage = '';
  }
}