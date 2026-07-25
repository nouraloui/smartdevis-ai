import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { DevisService } from '../../../core/services/devis.service';
import { ProjetService } from '../../../core/services/projet.service';

@Component({
  selector: 'app-devis-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './devis-form.component.html',
  styleUrl: './devis-form.component.css'
})
export class DevisFormComponent implements OnInit {
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

  originalPuContratFcfaArrondi = 0;

  devisForm = this.fb.group({
    section: ['A', Validators.required],
    designation: ['', Validators.required],
    categorie: ['', Validators.required],
    sousCategorie: [''],
    unite: [''],

    quantite: [0],
    puContratFcfaArrondi: [0],

    quantiteSite: [0],
    prixRevientEur: [0],
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

        this.originalPuContratFcfaArrondi = d.puContratFcfaArrondi || 0;

        this.devisForm.patchValue({
          section: d.section || 'A',
          designation: d.designation || '',
          categorie: d.categorie || '',
          sousCategorie: d.sousCategorie || '',
          unite: d.unite || '',

          quantite: d.quantite || 0,
          puContratFcfaArrondi: d.puContratFcfaArrondi || 0,

          quantiteSite: d.quantiteSite || 0,
          prixRevientEur: d.prixRevientEur || 0,
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
      puContratFcfaArrondi: Number(raw.puContratFcfaArrondi) || 0,
      quantiteSite: Number(raw.quantiteSite) || 0,
      prixRevientEur: Number(raw.prixRevientEur) || 0,
      tauxFg: (Number(raw.tauxFg) || 0) / 100
    };
  }

  get puContratFcfaArrondi(): number {
    if (this.isEditMode) {
      return this.originalPuContratFcfaArrondi;
    }

    return this.numberData.puContratFcfaArrondi;
  }

  get montantFcfa(): number {
    const d = this.numberData;
    return d.quantite * this.puContratFcfaArrondi;
  }

  get montantEur(): number {
    return this.montantFcfa / this.tauxEurFcfa;
  }

  get puSiteEur(): number {
    const d = this.numberData;
    return d.quantiteSite > 0 ? d.prixRevientEur / d.quantiteSite : 0;
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

    const data: any = {
      ...rawData,

      phase: 'phase2',

      projet: this.projetId,
      code_projet: this.projet?.code_projet || 'DI-M3',

      quantite: Number(rawData.quantite) || 0,
      puContratFcfaArrondi: this.puContratFcfaArrondi,
      puContratFcfaExact: this.puContratFcfaArrondi,

      montantFcfa: this.montantFcfa,
      montantEur: this.montantEur,

      quantiteSite: Number(rawData.quantiteSite) || 0,
      prixRevientEur: Number(rawData.prixRevientEur) || 0,
      puSiteEur: this.puSiteEur,

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
      this.router.navigate(['/projets', this.projetId, 'devis']);
      return;
    }

    this.router.navigate(['/devis']);
  }

  getProjectLabel(): string {
    if (!this.projet) {
      return 'Projet';
    }

    return this.projet.code_projet
      ? `${this.projet.code_projet} — ${this.projet.nom || 'Projet'}`
      : this.projet.nom || 'Projet';
  }
}