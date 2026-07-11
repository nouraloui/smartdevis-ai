import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';

import { DashboardComponent } from './features/dashboard/dashboard/dashboard.component';
import { DevisListComponent } from './features/devis/devis-list/devis-list.component';
import { DevisFormComponent } from './features/devis/devis-form/devis-form.component';
import { AnalyseIaComponent } from './features/analyses-ia/analyse-ia/analyse-ia.component';
import { ProjetsComponent } from './features/projets/projets/projets.component';
import { ParametresComponent } from './features/parametres/parametres/parametres.component';
import { IaNlpComponent } from './features/ia-nlp/ia-nlp/ia-nlp.component';
import { N8nAgentComponent } from './features/n8n-agent/n8n-agent/n8n-agent.component';
import { DevisPhase1ListComponent } from './features/devis/devis-phase1-list/devis-phase1-list.component';
import { DevisPhase1FormComponent } from './features/devis/devis-phase1-form/devis-phase1-form.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Auth
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },

  // Pages principales
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'analyses-ia',
    component: AnalyseIaComponent,
    canActivate: [authGuard]
  },
  {
    path: 'ia-nlp',
    component: IaNlpComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projets',
    component: ProjetsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'parametres',
    component: ParametresComponent,
    canActivate: [authGuard]
  },

  // Anciennes routes globales Devis supprimées :
  // Chaque devis doit maintenant appartenir à un projet.
  {
    path: 'devis',
    redirectTo: 'projets',
    pathMatch: 'full'
  },
  {
    path: 'devis/new',
    redirectTo: 'projets',
    pathMatch: 'full'
  },
  {
    path: 'devis/edit/:id',
    redirectTo: 'projets',
    pathMatch: 'full'
  },

  // Devis par projet
  {
    path: 'projets/:projetId/devis',
    component: DevisListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projets/:projetId/devis/new',
    component: DevisFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projets/:projetId/devis/edit/:id',
    component: DevisFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'n8n-agent',
    component: N8nAgentComponent,
    canActivate: [authGuard]
  } ,

  {
  path: 'projets/:projetId/devis',
  component: DevisListComponent
},
{
  path: 'projets/:projetId/devis/new',
  component: DevisFormComponent
},
{
  path: 'projets/:projetId/devis/edit/:id',
  component: DevisFormComponent
},

{
  path: 'projets/:projetId/devis-phase1',
  component: DevisPhase1ListComponent
},
{
  path: 'projets/:projetId/devis-phase1/new',
  component: DevisPhase1FormComponent
},
{
  path: 'projets/:projetId/devis-phase1/edit/:id',
  component: DevisPhase1FormComponent
},

  // Fallback
  { path: '**', redirectTo: 'login' }
];