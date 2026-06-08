import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { DevisService } from '../../../core/services/devis.service';
import { ProjetService } from '../../../core/services/projet.service';

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

    this.devisService.getAllDevis(this.projetId).subscribe({
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
      const section = String(
        d.section || d.code_section || d.codeSection || ''
      ).toLowerCase();

      const designation = String(
        d.designation || d.libelle_section || d.libelleSection || ''
      ).toLowerCase();

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
}