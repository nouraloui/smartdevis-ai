\# Plan de déploiement SmartDevis AI



\## 1. Composants à déployer



\- Frontend : Angular

\- Backend : Node.js / Express

\- Base MongoDB : données application

\- Base MySQL : données décisionnelles

\- n8n : agent IA et workflows

\- IA : OpenAI API / Ollama selon environnement



\## 2. Ports utilisés



\- Frontend : 4200

\- Backend : 3000

\- MongoDB : 27017

\- MySQL : 3306

\- n8n : 5678



\## 3. Variables d’environnement



Backend :

\- MONGO\_URI

\- MYSQL\_HOST

\- MYSQL\_USER

\- MYSQL\_PASSWORD

\- MYSQL\_DATABASE

\- JWT\_SECRET

\- IA\_SERVICE\_URL



n8n :

\- OPENAI\_API\_KEY

\- N8N\_HOST

\- N8N\_PORT

\- WEBHOOK\_URL



\## 4. Objectif DevOps



Déployer tous les services avec Docker Compose.



\## 5. Objectif MLOps



Suivre les prompts, réponses IA, erreurs, temps de réponse et conversations.

