import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssistantService } from '../../../core/services/assistant-ia.service';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  text: string;
  time: string;
}

@Component({
  selector: 'app-assistant-ai',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant-ia.component.html',
  styleUrls: ['./assistant-ia.component.css']
})
export class AssistantAiComponent {
  isOpen = false;
  userInput = '';
  isLoading = false;

  chatHistory: ChatMessage[] = [
    {
      role: 'assistant',
      text:
        "Bonjour ! 👋\nJe suis votre assistant spécialisé dans l’analyse des devis.\n\nJe peux vous aider à analyser les marges, détecter les anomalies, expliquer les risques et proposer des optimisations.",
      time: this.getCurrentTime()
    }
  ];

  quickSuggestions: string[] = [
    'Analyser le dernier devis',
    'Quels sont les points faibles ?',
    'Comment améliorer la marge ?',
    'Détecter une anomalie',
    'Proposer une optimisation'
  ];

  constructor(private assistantService: AssistantService) {}

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    const message = this.userInput.trim();

    if (!message || this.isLoading) {
      return;
    }

    this.addMessage('user', message);
    this.userInput = '';
    this.isLoading = true;

    this.assistantService.askAssistant(message).subscribe({
      next: (res: any) => {
        const responseText =
          res?.response ||
          res?.reply ||
          res?.data?.response ||
          res?.data?.reply ||
          'Je n’ai pas pu générer une réponse pour cette demande.';

        this.addMessage('assistant', responseText);
        this.isLoading = false;
      },
      error: () => {
        this.addMessage(
          'assistant',
          "Désolé, une erreur est survenue. Vérifiez que le backend Node.js et le service IA FastAPI sont bien lancés."
        );
        this.isLoading = false;
      }
    });
  }

  sendSuggestion(suggestion: string): void {
    if (this.isLoading) {
      return;
    }

    this.userInput = suggestion;
    this.sendMessage();
  }

  private addMessage(role: ChatRole, text: string): void {
    this.chatHistory.push({
      role,
      text,
      time: this.getCurrentTime()
    });
  }

  private getCurrentTime(): string {
    const now = new Date();

    return now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}