import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { DevisService } from '../../../core/services/devis.service';
import { ProjetService } from '../../../core/services/projet.service';

@Component({
  selector: 'app-devis-phase1-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './devis-phase1-form.component.html',
  styleUrl: './devis-phase1-form.component.css'
})
export class DevisPhase1FormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private devisService = inject(DevisService);
  private projetService = inject(ProjetService);

  readonly tauxEurFcfa = 655.957;

  loading = false;
  errorMessage = '';

  isEditMode = false;
  devisId: string | null = null;

  projetId: string | null = null;
  projet: any = null;

  devisForm = this.fb.group({
    section: ['A', Validators.required],
    designation: ['', Validators.required],
    categorie: ['', Validators.required],
    sousCategorie: [''],
    unite: [''],

    quantite: [1],

    quantiteSite: [0],
    prixRevientEur: [0],
    coefficientContrat: [1.5],

    tauxFg: [5],

    statut: ['brouillon']
  });

  ngOnInit(): void {
    this.projetId = this.route.snapshot.paramMap.get('projetId');
    this.devisId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.devisId;

    if (this.projetId) {
      this.loadProjet(this.projetId);
    }

    if (this.isEditMode && this.devisId) {
      this.loadDevis(this.devisId);
    }
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

  loadDevis(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.devisService.getDevisById(id).subscribe({
      next: (res: any) => {
        const d = res?.data || {};

        this.devisForm.patchValue({
          section: d.section || 'A',
          designation: d.designation || '',
          categorie: d.categorie || '',
          sousCategorie: d.sousCategorie || '',
          unite: d.unite || '',

          quantite: d.quantite || 1,

          quantiteSite: d.quantiteSite || 0,
          prixRevientEur: d.prixRevientEur || 0,
          coefficientContrat: d.coefficientContrat || 1.5,

          tauxFg: d.tauxFg > 1 ? d.tauxFg : (d.tauxFg || 0.05) * 100,

          statut: d.statut || 'brouillon'
        });

        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors du chargement de la ligne.';
      }
    });
  }

  get numberData() {
    const raw = this.devisForm.getRawValue();

    return {
      quantite: Number(raw.quantite) || 0,
      quantiteSite: Number(raw.quantiteSite) || 0,
      prixRevientEur: Number(raw.prixRevientEur) || 0,
      coefficientContrat: Number(raw.coefficientContrat) || 1.5,
      tauxFg: (Number(raw.tauxFg) || 0) / 100
    };
  }

  get puSiteEur(): number {
    const d = this.numberData;
    return d.quantiteSite > 0 ? d.prixRevientEur / d.quantiteSite : 0;
  }

  get puContratFcfaExact(): number {
    const d = this.numberData;
    return this.puSiteEur * this.tauxEurFcfa * d.coefficientContrat;
  }

  get puContratFcfaArrondi(): number {
    return this.puContratFcfaExact > 0
      ? Math.ceil(this.puContratFcfaExact / 1000) * 1000
      : 0;
  }

  get montantFcfa(): number {
    const d = this.numberData;
    return d.quantite * this.puContratFcfaArrondi;
  }

  get montantEur(): number {
    return this.montantFcfa / this.tauxEurFcfa;
  }

  get margeBruteEur(): number {
    const d = this.numberData;
    return this.montantEur - d.prixRevientEur;
  }

  get fraisGestionEur(): number {
    const d = this.numberData;
    return d.prixRevientEur * d.tauxFg;
  }

  get margeNetteEur(): number {
    return this.margeBruteEur - this.fraisGestionEur;
  }

  get margeNettePct(): number {
    return this.montantEur > 0
      ? (this.margeNetteEur / this.montantEur) * 100
      : 0;
  }

  onSubmit(): void {
    if (this.devisForm.invalid) {
      this.devisForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const rawData = this.devisForm.getRawValue();

    const data = {
      ...rawData,

      phase: 'phase1',

      projet: this.projetId,
      code_projet: this.projet?.code_projet || 'DI-M3',

      quantite: Number(rawData.quantite) || 0,
      quantiteSite: Number(rawData.quantiteSite) || 0,
      prixRevientEur: Number(rawData.prixRevientEur) || 0,
      coefficientContrat: Number(rawData.coefficientContrat) || 1.5,

      puSiteEur: this.puSiteEur,
      puContratFcfaExact: this.puContratFcfaExact,
      puContratFcfaArrondi: this.puContratFcfaArrondi,

      montantFcfa: this.montantFcfa,
      montantEur: this.montantEur,

      tauxFg: (Number(rawData.tauxFg) || 0) / 100,
      fraisGestionEur: this.fraisGestionEur,

      margeBruteEur: this.margeBruteEur,
      margeNetteEur: this.margeNetteEur,
      margeNettePct: this.margeNettePct,

      tauxEurFcfa: this.tauxEurFcfa,

      ligneType: 'categorie',
      source: 'devis'
    };

    if (this.isEditMode && this.devisId) {
      this.devisService.updateDevis(this.devisId, data).subscribe({
        next: () => {
          this.loading = false;
          this.navigateBack();
        },
        error: (err: any) => {
          this.loading = false;
          this.errorMessage =
            err?.error?.message || 'Erreur lors de la modification.';
        }
      });

      return;
    }

    this.devisService.createDevis(data).subscribe({
      next: () => {
        this.loading = false;
        this.navigateBack();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors de l’enregistrement.';
      }
    });
  }

  navigateBack(): void {
    if (this.projetId) {
      this.router.navigate(['/projets', this.projetId, 'devis-phase1']);
      return;
    }

    this.router.navigate(['/devis-phase1']);
  }
}