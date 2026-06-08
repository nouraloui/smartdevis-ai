import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { N8nAgentService, N8nAgentResponse } from '../../../core/services/n8n-agent.service';

interface ChatMessage {
  sender: 'user' | 'agent';
  text: string;
  time: Date;
}

@Component({
  selector: 'app-n8n-agent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './n8n-agent.component.html',
  styleUrls: ['./n8n-agent.component.css']
})
export class N8nAgentComponent implements OnInit {

  userMessage = '';
  loading = false;
  agentOnline = false;
  errorMessage = '';

  messages: ChatMessage[] = [
    {
      sender: 'agent',
      text: 'Bonjour, je suis SmartDevis AI. Je peux vous aider à analyser les devis, les coûts, les marges et les anomalies.',
      time: new Date()
    }
  ];

  suggestions: string[] = [
    'Présente-moi le projet SmartDevis AI',
    'Analyse les coûts du devis DI-M3',
    'Quelles sont les catégories les plus coûteuses ?',
    'Explique la marge nette et les frais de gestion',
    'Donne-moi des recommandations pour optimiser le devis'
  ];

  constructor(private n8nAgentService: N8nAgentService) {}

  ngOnInit(): void {
    this.checkAgentStatus();
  }

  checkAgentStatus(): void {
    this.n8nAgentService.checkStatus().subscribe({
      next: () => {
        this.agentOnline = true;
      },
      error: () => {
        this.agentOnline = false;
      }
    });
  }

  sendMessage(): void {
    const message = this.userMessage.trim();

    if (!message || this.loading) {
      return;
    }

    this.errorMessage = '';

    this.messages.push({
      sender: 'user',
      text: message,
      time: new Date()
    });

    this.userMessage = '';
    this.loading = true;

    this.n8nAgentService.askAgent(message).subscribe({
      next: (response: N8nAgentResponse) => {
        this.messages.push({
          sender: 'agent',
          text: response.answer || 'Aucune réponse reçue depuis l’agent IA.',
          time: new Date()
        });

        this.loading = false;
      },
      error: (error: Error) => {
        this.errorMessage = error.message;

        this.messages.push({
          sender: 'agent',
          text: 'Désolé, une erreur est survenue lors de la communication avec l’agent IA.',
          time: new Date()
        });

        this.loading = false;
      }
    });
  }

  sendSuggestion(question: string): void {
    this.userMessage = question;
    this.sendMessage();
  }

  clearChat(): void {
    this.messages = [
      {
        sender: 'agent',
        text: 'Conversation réinitialisée. Comment puis-je vous aider ?',
        time: new Date()
      }
    ];

    this.errorMessage = '';
  }
}