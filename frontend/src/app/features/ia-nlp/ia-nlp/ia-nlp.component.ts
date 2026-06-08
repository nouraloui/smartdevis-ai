import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IaNlpService } from '../../../core/services/ia-nlp.service';

@Component({
  selector: 'app-ia-nlp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ia-nlp.component.html',
  styleUrl: './ia-nlp.component.css'
})
export class IaNlpComponent {
  private iaNlpService = inject(IaNlpService);

  projets = [
    { label: 'Toutes les données', value: 'ALL' },
    { label: 'DI-M3', value: 'DI-M3' },
    { label: 'DI', value: 'DI' }
  ];

  codeProjet = 'ALL';

  loading = false;
  errorMessage = '';

  nClusters = 6;

  result: any = null;
  selectedTab: 'clusters' | 'outliers' | 'similarities' = 'clusters';

  checkProjetSelected(): boolean {
    if (!this.codeProjet || this.codeProjet === 'ALL') {
      this.errorMessage =
        'Veuillez choisir un projet précis avant de lancer l’analyse IA.';

      this.result = null;
      this.loading = false;

      return false;
    }

    return true;
  }

  lancerAnalyse(): void {
    if (!this.checkProjetSelected()) return;

    this.loading = true;
    this.errorMessage = '';
    this.result = null;

    this.iaNlpService.semanticAnalysis(this.nClusters, this.codeProjet).subscribe({
      next: (res: any) => {
        this.result = res;
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors de l’analyse sémantique IA.';
      }
    });
  }

  get lignesAvecSimilarites(): any[] {
    return this.result?.results?.filter((x: any) => x.similarItems?.length > 0) || [];
  }
}