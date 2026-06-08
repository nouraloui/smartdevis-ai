import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjetService } from '../../../core/services/projet.service';

@Component({
  selector: 'app-projets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projets.component.html',
  styleUrl: './projets.component.css'
})
export class ProjetsComponent implements OnInit {
  private projetService = inject(ProjetService);
  private router = inject(Router);

  activePage: 'list' | 'create' = 'list';

  projets: any[] = [];
  filteredProjets: any[] = [];

  kpis: any = {};
  loading = false;
  errorMessage = '';
  successMessage = '';
  search = '';

  editMode = false;
  selectedId: string | null = null;

  form: any = {
    code_projet: '',
    nom: '',
    client: '',
    departement: '',
    directeur: '',
    chef_projet: '',
    duree_mois: 0,
    numero_contrat: 0,
    date_devis: '',
    date_debut: '',
    date_fin: '',
    budget_prevu_fcfa: 0,
    montant_realise_fcfa: 0,
    avancement: 0,
    statut: 'planifie',
    description: ''
  };

  ngOnInit(): void {
    this.loadProjets();
  }

  changePage(page: 'list' | 'create'): void {
    this.activePage = page;
    this.errorMessage = '';
    this.successMessage = '';

    if (page === 'create') {
      this.editMode = false;
      this.selectedId = null;
      this.resetFormOnly();
    }
  }

  loadProjets(): void {
    this.loading = true;
    this.errorMessage = '';

    this.projetService.getAll().subscribe({
      next: (response) => {
        this.projets = response?.data || [];
        this.filteredProjets = [...this.projets];
        this.kpis = response?.kpis || {};
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Erreur lors du chargement des projets.';
      }
    });
  }

  applySearch(): void {
    const q = this.search.trim().toLowerCase();

    this.filteredProjets = this.projets.filter((p) => {
      const content = `
        ${p.code_projet || ''}
        ${p.nom || ''}
        ${p.client || ''}
        ${p.departement || ''}
        ${p.directeur || ''}
        ${p.chef_projet || ''}
        ${p.statut || ''}
        ${p.risque || ''}
      `.toLowerCase();

      return q ? content.includes(q) : true;
    });
  }

  editProjet(p: any): void {
    this.activePage = 'create';
    this.editMode = true;
    this.selectedId = p._id;

    this.form = {
      code_projet: p.code_projet || '',
      nom: p.nom || `Mission de contrôle ${p.code_projet || ''}`,
      client: p.client || '',
      departement: p.departement || '',
      directeur: p.directeur || '',
      chef_projet: p.chef_projet || '',
      duree_mois: p.duree_mois || 0,
      numero_contrat: p.numero_contrat || 0,
      date_devis: p.date_devis ? p.date_devis.substring(0, 10) : '',
      date_debut: p.date_debut ? p.date_debut.substring(0, 10) : '',
      date_fin: p.date_fin ? p.date_fin.substring(0, 10) : '',
      budget_prevu_fcfa: p.budget_prevu_fcfa || 0,
      montant_realise_fcfa: p.montant_realise_fcfa || 0,
      avancement: p.avancement || 0,
      statut: p.statut || 'planifie',
      description: p.description || ''
    };
  }

  saveProjet(): void {
    if (!this.form.code_projet) {
      this.errorMessage = 'Le code projet est obligatoire.';
      return;
    }

    if (!this.form.nom) {
      this.form.nom = `Mission de contrôle ${this.form.code_projet}`;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (this.editMode && this.selectedId) {
      this.projetService.update(this.selectedId, this.form).subscribe({
        next: () => {
          this.successMessage = 'Projet modifié avec succès.';
          this.activePage = 'list';
          this.loadProjets();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Erreur lors de la modification.';
        }
      });
    } else {
      this.projetService.create(this.form).subscribe({
        next: () => {
          this.successMessage = 'Projet créé avec succès.';
          this.activePage = 'list';
          this.loadProjets();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Erreur lors de la création.';
        }
      });
    }
  }

  deleteProjet(id: string): void {
    if (!confirm('Voulez-vous vraiment supprimer ce projet ?')) return;

    this.projetService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Projet supprimé avec succès.';
        this.loadProjets();
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || 'Erreur lors de la suppression.';
      }
    });
  }

  openProjectDevis(p: any): void {
    this.router.navigate(['/projets', p._id, 'devis']);
  }

  createProjectDevis(p: any): void {
    this.router.navigate(['/projets', p._id, 'devis', 'new']);
  }

  resetFormOnly(): void {
    this.form = {
      code_projet: '',
      nom: '',
      client: '',
      departement: '',
      directeur: '',
      chef_projet: '',
      duree_mois: 0,
      numero_contrat: 0,
      date_devis: '',
      date_debut: '',
      date_fin: '',
      budget_prevu_fcfa: 0,
      montant_realise_fcfa: 0,
      avancement: 0,
      statut: 'planifie',
      description: ''
    };
  }

  getProjectName(p: any): string {
    return p.nom || `Mission de contrôle ${p.code_projet || '-'}`;
  }

  getProgressClass(value: number): string {
    if (value >= 80) return 'progress-good';
    if (value >= 40) return 'progress-medium';
    return 'progress-low';
  }

  getRisqueLabel(risque: string): string {
    if (risque === 'eleve') return 'Élevé';
    if (risque === 'moyen') return 'Moyen';
    return 'Faible';
  }
}