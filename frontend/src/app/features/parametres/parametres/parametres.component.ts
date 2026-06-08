import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SettingCard {
  title: string;
  description: string;
  icon: string;
  badge: string;
  section: string;
}

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css'
})
export class ParametresComponent implements OnInit {
  selectedSection = '';
  currentUser: any = null;

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    this.currentUser = user ? JSON.parse(user) : null;
  }

  cards: SettingCard[] = [
    {
      title: 'Profil utilisateur',
      description: 'Gérer les informations du compte connecté, le rôle et les préférences utilisateur.',
      icon: 'pi pi-user',
      badge: 'Compte',
      section: 'profil'
    },
    {
      title: 'Informations entreprise',
      description: 'Configurer le logo, les coordonnées et les informations affichées dans les documents.',
      icon: 'pi pi-building',
      badge: 'Entreprise',
      section: 'entreprise'
    },
    {
      title: 'Configuration des devis',
      description: 'Définir les règles de calcul, les frais de gestion, les devises et les arrondis.',
      icon: 'pi pi-file-edit',
      badge: 'Devis',
      section: 'devis'
    },
    {
      title: 'Analyse intelligente',
      description: 'Paramétrer les seuils IA pour la détection d’anomalies et les suggestions automatiques.',
      icon: 'pi pi-chart-line',
      badge: 'IA',
      section: 'ia'
    },
    {
      title: 'Sécurité et accès',
      description: 'Gérer les mots de passe, les rôles, les accès et les paramètres de sécurité.',
      icon: 'pi pi-shield',
      badge: 'Sécurité',
      section: 'securite'
    },
    {
      title: 'Exports et documents',
      description: 'Personnaliser les exports PDF, Excel, les signatures et les modèles de devis.',
      icon: 'pi pi-download',
      badge: 'Exports',
      section: 'exports'
    }
  ];

  selectSection(section: string): void {
    this.selectedSection = section;
    setTimeout(() => {
      document.getElementById('settings-content')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  closeSection(): void {
    this.selectedSection = '';
  }

  saveSettings(): void {
    alert('Paramètres sauvegardés avec succès.');
  }
}