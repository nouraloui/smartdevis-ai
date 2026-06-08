import os

# Optimisation pour éviter les conflits TensorFlow si non utilisé
os.environ["USE_TF"] = "0"
os.environ["TRANSFORMERS_NO_TF"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.cluster import KMeans
from sentence_transformers import SentenceTransformer
from typing import List, Optional
import numpy as np
import uvicorn
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics.pairwise import cosine_similarity


# =========================
# APPLICATION FASTAPI
# =========================

app = FastAPI(title="SmartDevis AI - IA Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# CHARGEMENT DU MODÈLE NLP
# =========================

nlp_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")


# =========================
# SCHÉMAS DE DONNÉES
# =========================

class ChatRequest(BaseModel):
    user_message: str
    db_context: Optional[List[dict]] = None
    metadata: Optional[dict] = None


class AnomalyRequest(BaseModel):
    pu_fcfa: float
    quantite: float = 1
    montant_fcfa: float = 0


class RiskScoreRequest(BaseModel):
    pu_fcfa: float
    quantite: float = 1
    montant_fcfa: float = 0
    prix_revient_fcfa: float = 0
    frais_gestion_pct: float = 0
    marge_nette_pct: float = 0


class SuggestionRequest(BaseModel):
    quantite: float = 1
    prix_revient_fcfa: float = 0
    categorie_code: float = 1


class MarginPredictionRequest(BaseModel):
    pu_fcfa: float
    quantite: float = 1
    prix_revient_fcfa: float = 0
    frais_gestion_pct: float = 5
    categorie_code: float = 1


class ServiceLine(BaseModel):
    id: Optional[str] = None
    section: Optional[str] = ""
    designation: Optional[str] = ""
    categorie: Optional[str] = ""
    sousCategorie: Optional[str] = ""
    unite: Optional[str] = ""
    puContratFcfaArrondi: Optional[float] = 0
    montantFcfa: Optional[float] = 0
    margeNettePct: Optional[float] = 0


class SemanticRequest(BaseModel):
    lignes: List[ServiceLine]
    n_clusters: Optional[int] = 6


# =========================
# HELPERS
# =========================

def to_float(value, default=0.0):
    try:
        if value is None or value == "":
            return default

        if isinstance(value, str):
            value = (
                value
                .replace(" ", "")
                .replace(",", ".")
                .replace("%", "")
            )

        return float(value)
    except Exception:
        return default


def money_fcfa(value):
    return f"{value:,.0f}".replace(",", " ") + " FCFA"


def money_eur(value):
    return f"{value:,.2f}".replace(",", " ").replace(".", ",") + " EUR"


def pct(value):
    return f"{value:.2f}".replace(".", ",") + " %"


def get_text(value, default="-"):
    if value is None or value == "":
        return default

    return str(value)


# =========================
# ROOT
# =========================

@app.get("/")
def root():
    return {
        "message": "IA Service SmartDevis AI opérationnel",
        "endpoints": [
            "/chat",
            "/detect-anomaly",
            "/risk-score",
            "/suggest-values",
            "/predict-margin",
            "/semantic-analysis"
        ]
    }


# =========================
# ENDPOINT ASSISTANT IA
# =========================

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    message = request.user_message.lower()
    context = request.db_context if request.db_context else []
    metadata = request.metadata if request.metadata else {}

    intent = metadata.get("intent", "general")
    requested_id = metadata.get("id")
    requested_section = metadata.get("section")

    if not context:
        return {
            "reply": (
                "⚠️ Aucun devis correspondant n’a été trouvé.\n\n"
                "Je ne peux pas produire une analyse fiable sans données disponibles."
            )
        }

    devis = context[0]

    devis_id = get_text(devis.get("id") or devis.get("_id"), "-")
    designation = get_text(devis.get("designation"), "-")
    section = get_text(devis.get("section"), "-")
    categorie = get_text(devis.get("categorie"), "-")
    sous_categorie = get_text(devis.get("sousCategorie"), "-")

    quantite = to_float(devis.get("quantite"))
    pu_fcfa = to_float(devis.get("puContratFcfaArrondi"))
    pu_exact_fcfa = to_float(devis.get("puContratFcfaExact"))

    montant_fcfa = to_float(devis.get("montantFcfa"))
    montant_eur = to_float(devis.get("montantEur"))

    quantite_site = to_float(devis.get("quantiteSite"))
    pu_site_eur = to_float(devis.get("puSiteEur"))

    prix_revient = to_float(devis.get("prixRevientEur"))
    marge_brute = to_float(devis.get("margeBruteEur"))
    frais_gestion = to_float(devis.get("fraisGestionEur"))
    marge_nette = to_float(devis.get("margeNetteEur"))
    marge_pct = to_float(devis.get("margeNettePct"))

    statut = get_text(devis.get("statut"), "brouillon")

    prefix = "du devis demandé" if requested_id else "du dernier devis exploitable"

    def build_dynamic_weaknesses(
        quantite,
        pu_fcfa,
        montant_fcfa,
        montant_eur,
        pu_site_eur,
        prix_revient,
        marge_brute,
        frais_gestion,
        marge_nette,
        marge_pct
    ):
        points = []

        ratio_prix_revient = (
            prix_revient / montant_eur * 100
            if montant_eur > 0
            else 0
        )

        ratio_prix_site = (
            pu_site_eur / montant_eur * 100
            if montant_eur > 0
            else 0
        )

        ratio_fg = (
            frais_gestion / montant_eur * 100
            if montant_eur > 0
            else 0
        )

        ratio_marge_brute = (
            marge_brute / montant_eur * 100
            if montant_eur > 0
            else 0
        )

        if quantite <= 0:
            points.append(
                "La quantité est nulle ou manquante, ce qui rend le calcul du montant contrat non fiable."
            )

        if pu_fcfa <= 0:
            points.append(
                "Le prix unitaire contrat FCFA est nul ou manquant."
            )

        if montant_fcfa <= 0:
            points.append(
                "Le montant contrat FCFA est nul, ce qui empêche une analyse financière fiable."
            )

        if montant_eur <= 0:
            points.append(
                "Le montant EUR est nul, donc la marge ne peut pas être correctement interprétée."
            )

        if pu_site_eur <= 0:
            points.append(
                "Le prix site EUR est nul ou manquant."
            )

        if marge_nette < 0:
            points.append(
                f"La marge nette est négative ({money_eur(marge_nette)}), donc la ligne génère une perte."
            )
        elif marge_pct < 0:
            points.append(
                f"Le taux de marge nette est négatif ({pct(marge_pct)}), ce qui indique une rentabilité défavorable."
            )
        elif marge_pct < 10:
            points.append(
                f"La marge nette est très faible ({pct(marge_pct)}), ce qui expose le devis à un risque élevé."
            )
        elif marge_pct < 15:
            points.append(
                f"La marge nette est faible ({pct(marge_pct)}), une optimisation est recommandée avant validation."
            )
        elif marge_pct < 20:
            points.append(
                f"La marge nette est acceptable mais fragile ({pct(marge_pct)}). Une légère hausse des coûts peut la rendre insuffisante."
            )
        elif marge_pct < 25:
            points.append(
                f"La marge nette est correcte ({pct(marge_pct)}), mais elle reste inférieure au seuil de confort de 25 %."
            )

        if montant_eur > 0:
            if ratio_prix_revient >= 95:
                points.append(
                    f"Le prix de revient représente {pct(ratio_prix_revient)} du montant EUR : il consomme presque toute la valeur du devis."
                )
            elif ratio_prix_revient >= 80:
                points.append(
                    f"Le prix de revient représente {pct(ratio_prix_revient)} du montant EUR, ce qui limite fortement la marge."
                )
            elif ratio_prix_revient >= 65:
                points.append(
                    f"Le prix de revient représente {pct(ratio_prix_revient)} du montant EUR : ce poste doit rester sous contrôle."
                )

        if montant_eur > 0:
            if ratio_prix_site >= 95:
                points.append(
                    f"Le prix site représente {pct(ratio_prix_site)} du montant EUR : il ne laisse quasiment aucune marge avant frais de gestion."
                )
            elif ratio_prix_site >= 80:
                points.append(
                    f"Le prix site représente {pct(ratio_prix_site)} du montant EUR, ce qui réduit fortement la rentabilité."
                )

        if marge_brute < 0:
            points.append(
                f"La marge brute est négative ({money_eur(marge_brute)}), le prix de revient dépasse le montant EUR."
            )
        elif marge_brute == 0 and montant_eur > 0:
            points.append(
                "La marge brute est nulle : les frais de gestion rendent automatiquement la marge nette négative."
            )
        elif montant_eur > 0 and ratio_marge_brute < 10:
            points.append(
                f"La marge brute est faible ({pct(ratio_marge_brute)} du montant EUR), ce qui laisse peu de sécurité."
            )

        if montant_eur > 0:
            if ratio_fg >= 10:
                points.append(
                    f"Les frais de gestion représentent {pct(ratio_fg)} du montant EUR, ce qui pèse fortement sur la marge."
                )
            elif ratio_fg >= 5:
                points.append(
                    f"Les frais de gestion représentent {pct(ratio_fg)} du montant EUR : ils doivent être surveillés."
                )

        if not points:
            points.append(
                f"Aucun point critique détecté : la marge nette est confortable ({pct(marge_pct)}) et les coûts semblent maîtrisés."
            )

        return points

    points_faibles = build_dynamic_weaknesses(
        quantite,
        pu_fcfa,
        montant_fcfa,
        montant_eur,
        pu_site_eur,
        prix_revient,
        marge_brute,
        frais_gestion,
        marge_nette,
        marge_pct
    )

    points_faibles_text = "\n".join([f"• {point}" for point in points_faibles])

    if marge_nette < 0 or marge_pct < 0 or quantite <= 0 or montant_fcfa <= 0 or pu_fcfa <= 0:
        decision = "Réviser avant validation"
        niveau = "Risque élevé"
        conclusion = (
            "Le devis présente un risque financier. "
            "Il ne doit pas être validé sans correction."
        )
    elif marge_pct < 15:
        decision = "Valider avec prudence"
        niveau = "Marge faible"
        conclusion = (
            "Le devis est exploitable, mais la marge reste faible. "
            "Une optimisation du prix site, du prix de revient ou des frais de gestion est recommandée."
        )
    elif marge_pct < 25:
        decision = "Validable avec suivi"
        niveau = "Acceptable"
        conclusion = (
            "Le devis présente une marge correcte. "
            "Il peut être validé avec un suivi des coûts site et des frais de gestion."
        )
    else:
        decision = "Validable"
        niveau = "Bon"
        conclusion = (
            "Le devis présente une bonne rentabilité et ne montre pas de risque majeur."
        )

    if intent == "weakness":
        return {
            "reply": f"""
⚠️ Points faibles {prefix}

📌 Devis analysé
• ID : {devis_id}
• Désignation : {designation}
• Section : {section}
• Catégorie : {categorie}
• Sous-catégorie : {sous_categorie}

🔎 Points faibles détectés
{points_faibles_text}

📉 Impact métier
• Quantité contrat : {quantite:.0f}
• PU contrat arrondi : {money_fcfa(pu_fcfa)}
• Montant contrat : {money_fcfa(montant_fcfa)}
• Montant EUR : {money_eur(montant_eur)}
• Quantité site : {quantite_site:.0f}
• Prix site : {money_eur(pu_site_eur)}
• Prix de revient : {money_eur(prix_revient)}
• Marge brute : {money_eur(marge_brute)}
• Frais de gestion : {money_eur(frais_gestion)}
• Marge nette : {money_eur(marge_nette)}
• Taux de marge nette : {pct(marge_pct)}

🎯 Conclusion
{conclusion}

✅ Décision recommandée
{decision}
""".strip()
        }

    if intent == "optimization":
        if marge_nette < 0:
            actions = (
                "1. Augmenter le prix contrat ou revoir le PU arrondi FCFA.\n"
                "2. Réduire le prix site ou renégocier le coût de revient.\n"
                "3. Réduire les frais de gestion si possible.\n"
                "4. Recalculer la marge après correction.\n"
                "5. Ne pas valider tant que la marge nette reste négative."
            )
        elif marge_pct < 15:
            actions = (
                "1. Optimiser le prix site pour améliorer la marge.\n"
                "2. Réduire les frais de gestion.\n"
                "3. Vérifier la cohérence du PU contrat avec les postes similaires.\n"
                "4. Viser une marge nette supérieure à 15 %."
            )
        elif marge_pct < 25:
            actions = (
                "1. Maintenir le prix contrat actuel.\n"
                "2. Surveiller le prix de revient car il consomme une part importante du montant EUR.\n"
                "3. Réduire légèrement les frais de gestion si possible.\n"
                "4. Comparer ce poste avec les postes similaires pour confirmer la cohérence du PU.\n"
                "5. Conserver une marge nette supérieure à 20 %."
            )
        else:
            actions = (
                "1. Conserver le prix contrat actuel.\n"
                "2. Maintenir le contrôle du prix site.\n"
                "3. Vérifier périodiquement les frais de gestion.\n"
                "4. Valider avec suivi standard de rentabilité."
            )

        return {
            "reply": f"""
🧠 Optimisation {prefix}

📌 Devis concerné
• ID : {devis_id}
• Désignation : {designation}
• Section : {section}
• Catégorie : {categorie}

🔧 Optimisations proposées
{actions}

📊 Situation actuelle
• Montant contrat : {money_fcfa(montant_fcfa)}
• Montant EUR : {money_eur(montant_eur)}
• Prix de revient : {money_eur(prix_revient)}
• Frais de gestion : {money_eur(frais_gestion)}
• Marge nette : {money_eur(marge_nette)}
• Taux de marge nette : {pct(marge_pct)}
• Niveau : {niveau}

✅ Décision recommandée
{decision}
""".strip()
        }

    if intent == "margin":
        return {
            "reply": f"""
📈 Analyse de la marge {prefix}

📌 Devis analysé
• ID : {devis_id}
• Désignation : {designation}
• Section : {section}
• Catégorie : {categorie}
• Sous-catégorie : {sous_categorie}

💰 Indicateurs
• Montant EUR : {money_eur(montant_eur)}
• Prix de revient : {money_eur(prix_revient)}
• Marge brute : {money_eur(marge_brute)}
• Frais de gestion : {money_eur(frais_gestion)}
• Marge nette : {money_eur(marge_nette)}
• Taux de marge nette : {pct(marge_pct)}

🔎 Lecture dynamique
{points_faibles_text}

🚦 Diagnostic
• Niveau : {niveau}
• Décision : {decision}

🎯 Conclusion
{conclusion}
""".strip()
        }

    if intent == "decision":
        return {
            "reply": f"""
🧾 Décision {prefix}

📌 Résultat
• Décision recommandée : {decision}
• Niveau d’analyse : {niveau}

📊 Justification
• ID : {devis_id}
• Section : {section}
• Montant FCFA : {money_fcfa(montant_fcfa)}
• Montant EUR : {money_eur(montant_eur)}
• Marge nette : {money_eur(marge_nette)}
• Taux de marge nette : {pct(marge_pct)}

⚠️ Points détectés
{points_faibles_text}

✅ Conclusion
{conclusion}
""".strip()
        }

    if intent == "comparison" or requested_section:
        total_montant = sum(to_float(d.get("montantEur")) for d in context)
        total_marge = sum(to_float(d.get("margeNetteEur")) for d in context)

        lignes_negatives = [
            d for d in context if to_float(d.get("margeNetteEur")) < 0
        ]

        lignes_faibles = [
            d for d in context
            if 0 <= to_float(d.get("margeNettePct")) < 15
        ]

        marge_pct_global = (
            total_marge / total_montant * 100
            if total_montant > 0
            else 0
        )

        section_label = requested_section if requested_section else section

        return {
            "reply": f"""
📊 Analyse dynamique de la section {section_label}

📌 Synthèse
• Nombre de lignes analysées : {len(context)}
• Montant total : {money_eur(total_montant)}
• Marge nette totale : {money_eur(total_marge)}
• Taux de marge global : {pct(marge_pct_global)}
• Lignes avec marge négative : {len(lignes_negatives)}
• Lignes à marge faible : {len(lignes_faibles)}

🎯 Lecture métier
La section {section_label} présente une rentabilité globale de {pct(marge_pct_global)}.

✅ Recommandation
Analyser en priorité les lignes à marge négative, puis les postes dont le prix site ou le prix de revient consomme une part élevée du montant contrat.
""".strip()
        }

    return {
        "reply": f"""
📊 Analyse dynamique {prefix}

📌 Informations générales
• ID : {devis_id}
• Désignation : {designation}
• Section : {section}
• Catégorie : {categorie}
• Sous-catégorie : {sous_categorie}
• Statut : {statut}

💰 Données financières
• Quantité : {quantite:.0f}
• PU contrat arrondi FCFA : {money_fcfa(pu_fcfa)}
• PU contrat exact FCFA : {money_fcfa(pu_exact_fcfa)}
• Montant FCFA : {money_fcfa(montant_fcfa)}
• Montant EUR : {money_eur(montant_eur)}
• Quantité site : {quantite_site:.0f}
• Prix site : {money_eur(pu_site_eur)}
• Prix de revient : {money_eur(prix_revient)}
• Marge brute : {money_eur(marge_brute)}
• Frais de gestion : {money_eur(frais_gestion)}
• Marge nette : {money_eur(marge_nette)}
• Taux de marge nette : {pct(marge_pct)}

🚦 Diagnostic
• Niveau : {niveau}
• Décision recommandée : {decision}

🔎 Lecture dynamique
{points_faibles_text}

✅ Conclusion
{conclusion}
""".strip()
    }


# =========================
# MODULE 1 — DÉTECTION D'ANOMALIES
# Isolation Forest
# =========================

@app.post("/detect-anomaly")
def detect_anomaly(data: AnomalyRequest):
    pu = float(data.pu_fcfa)
    quantite = float(data.quantite or 1)
    montant = float(data.montant_fcfa or pu * quantite)

    training_data = np.array([
        [875000, 6, 5250000],
        [2000000, 26, 52000000],
        [2100000, 10, 21000000],
        [2160000, 26, 56160000],
        [2240000, 26, 58240000],
        [2250000, 26, 58500000],
        [2560000, 14, 35840000],
        [4067000, 29, 117943000],
        [4428000, 1, 4428000],
        [6888000, 1, 6888000],
        [13284000, 1, 13284000],
        [22528594, 1, 22528594]
    ])

    model = IsolationForest(
        contamination=0.18,
        random_state=42
    )

    model.fit(training_data)

    input_data = np.array([[pu, quantite, montant]])
    prediction = model.predict(input_data)[0]
    score = model.decision_function(input_data)[0]

    is_anomaly = prediction == -1

    median_pu = np.median(training_data[:, 0])

    if is_anomaly:
        if pu > median_pu * 2:
            message = "PU FCFA anormalement élevé par rapport aux références DI-M3."
        elif pu < median_pu * 0.4:
            message = "PU FCFA anormalement bas par rapport aux références DI-M3."
        else:
            message = "Comportement atypique détecté sur cette ligne de devis."
    else:
        message = "PU FCFA normal selon les références DI-M3."

    return {
        "success": True,
        "model": "Isolation Forest",
        "anomalie": bool(is_anomaly),
        "score": float(score),
        "message": message,
        "input": {
            "pu_fcfa": pu,
            "quantite": quantite,
            "montant_fcfa": montant
        }
    }


# =========================
# MODULE 2 — SCORE DE RISQUE
# =========================

@app.post("/risk-score")
def risk_score(data: RiskScoreRequest):
    pu = float(data.pu_fcfa)
    quantite = float(data.quantite or 1)
    montant = float(data.montant_fcfa or pu * quantite)
    prix_revient = float(data.prix_revient_fcfa or 0)
    frais_pct = float(data.frais_gestion_pct or 0)
    marge_pct = float(data.marge_nette_pct or 0)

    score = 0
    causes = []
    recommandations = []

    if pu <= 0:
        score += 30
        causes.append("PU FCFA nul ou manquant.")
        recommandations.append("Saisir un prix unitaire contrat valide.")

    if quantite <= 0:
        score += 25
        causes.append("Quantité nulle ou manquante.")
        recommandations.append("Vérifier la quantité contractuelle.")

    if montant <= 0:
        score += 25
        causes.append("Montant FCFA nul.")
        recommandations.append("Recalculer le montant à partir du PU et de la quantité.")

    if prix_revient > 0 and montant > 0:
        ratio_cout = prix_revient / montant * 100

        if ratio_cout >= 95:
            score += 35
            causes.append(f"Le prix de revient représente {ratio_cout:.2f}% du montant.")
            recommandations.append("Réduire le prix de revient ou augmenter le PU contrat.")
        elif ratio_cout >= 80:
            score += 20
            causes.append(f"Le prix de revient est élevé : {ratio_cout:.2f}% du montant.")
            recommandations.append("Contrôler les coûts directs du poste.")
        elif ratio_cout >= 65:
            score += 10
            causes.append(f"Le prix de revient représente {ratio_cout:.2f}% du montant.")
            recommandations.append("Surveiller ce poste avant validation.")

    if frais_pct >= 10:
        score += 15
        causes.append("Frais de gestion élevés.")
        recommandations.append("Réduire les frais de gestion si possible.")
    elif frais_pct >= 5:
        score += 5
        causes.append("Frais de gestion à surveiller.")
        recommandations.append("Vérifier que le taux FG reste cohérent avec DI-M3.")

    if marge_pct < 0:
        score += 40
        causes.append("Marge nette négative.")
        recommandations.append("Ne pas valider sans correction.")
    elif marge_pct < 10:
        score += 25
        causes.append("Marge nette très faible.")
        recommandations.append("Revoir le PU contrat ou le prix de revient.")
    elif marge_pct < 15:
        score += 15
        causes.append("Marge nette faible.")
        recommandations.append("Valider uniquement avec prudence.")
    elif marge_pct < 25:
        score += 5
        causes.append("Marge correcte mais inférieure au seuil de confort de 25%.")
        recommandations.append("Suivre les coûts site et frais de gestion.")

    score = min(score, 100)

    if score >= 70:
        niveau = "Élevé"
        decision = "Réviser avant validation"
    elif score >= 35:
        niveau = "Moyen"
        decision = "Valider avec prudence"
    else:
        niveau = "Faible"
        decision = "Validable"

    if not causes:
        causes.append("Aucun risque critique détecté.")
        recommandations.append("Le devis peut être validé avec suivi standard.")

    return {
        "success": True,
        "score": score,
        "niveau": niveau,
        "decision": decision,
        "causes": causes,
        "recommandations": recommandations
    }


# =========================
# MODULE 3 — SUGGESTION DE VALEURS
# Random Forest Regressor
# =========================

@app.post("/suggest-values")
def suggest_values(data: SuggestionRequest):
    quantite = float(data.quantite or 1)
    prix_revient = float(data.prix_revient_fcfa or 0)
    categorie_code = float(data.categorie_code or 1)

    x_train = np.array([
        [1, 5000000, 1],
        [1, 8000000, 1],
        [1, 10000000, 1],
        [1, 12000000, 1],
        [1, 15000000, 1],
        [1, 2000000, 1],
        [1, 4000000, 1],

        [26, 35000000, 2],
        [26, 52000000, 2],
        [29, 105000000, 3],
        [14, 25000000, 3],

        [1, 34345000, 4]
    ])

    y_train = np.array([
        6888000,
        9000000,
        10412410,
        13284000,
        15000000,
        4428000,
        6888000,

        2250000,
        2160000,
        4067000,
        2560000,

        22528594
    ])

    model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        max_depth=5
    )

    model.fit(x_train, y_train)

    input_data = np.array([[quantite, prix_revient, categorie_code]])
    pu_rf = float(model.predict(input_data)[0])

    # Marge cible métier selon catégorie
    if categorie_code == 1:
        marge_cible_pct = 14.17
    elif categorie_code == 2:
        marge_cible_pct = 12.00
    elif categorie_code == 3:
        marge_cible_pct = 15.00
    else:
        marge_cible_pct = 10.00

    # PU minimum pour couvrir le prix de revient avec la marge cible
    if prix_revient > 0 and marge_cible_pct < 100:
        pu_metier = prix_revient / (1 - marge_cible_pct / 100)
    else:
        pu_metier = pu_rf

    # Correction métier :
    # on prend le plus grand entre la prédiction RF et le PU qui garantit la marge cible
    pu_optimal = max(pu_rf, pu_metier)

    montant_estime = pu_optimal * quantite

    marge_probable_pct = (
        ((montant_estime - prix_revient) / montant_estime) * 100
        if montant_estime > 0
        else 0
    )

    if marge_probable_pct < 10:
        fg_recommande = 3
    elif marge_probable_pct < 15:
        fg_recommande = 5
    else:
        fg_recommande = 5

    return {
        "success": True,
        "model": "Random Forest Regressor + correction métier",
        "message": "Suggestion générée avec succès par Random Forest",
        "pu_optimal_fcfa": round(pu_optimal),
        "marge_probable_pct": round(marge_probable_pct, 2),
        "fg_recommande_pct": fg_recommande,
        "details": {
            "pu_random_forest": round(pu_rf),
            "pu_minimum_metier": round(pu_metier),
            "marge_cible_pct": marge_cible_pct
        },
        "input": {
            "quantite": quantite,
            "prix_revient_fcfa": prix_revient,
            "categorie_code": categorie_code
        }
    }


# =========================
# MODULE 4 — PRÉDICTION DE MARGE
# XGBoost avec fallback Random Forest
# =========================

@app.post("/predict-margin")
def predict_margin(data: MarginPredictionRequest):
    pu = float(data.pu_fcfa)
    quantite = float(data.quantite or 1)
    prix_revient = float(data.prix_revient_fcfa or 0)
    frais_pct = float(data.frais_gestion_pct or 5)
    categorie_code = float(data.categorie_code or 1)

    montant = pu * quantite
    frais = prix_revient * (frais_pct / 100)

    marge_theorique = montant - prix_revient - frais
    marge_theorique_pct = (
        marge_theorique / montant * 100
        if montant > 0
        else 0
    )

    x_train = np.array([
        [13284000, 1, 12000000, 5, 1],
        [13284000, 1, 8000000, 5, 1],
        [4428000, 1, 4200000, 5, 1],
        [4067000, 29, 105000000, 5, 3],
        [6888000, 1, 8000000, 5, 1],
        [22528594, 1, 22528594, 5, 4],
        [2250000, 26, 52000000, 5, 2],
        [2560000, 14, 25000000, 5, 3],
        [2160000, 26, 50000000, 5, 2],
        [875000, 6, 4500000, 5, 2]
    ])

    y_train = np.array([
        9.52,
        34.75,
        0.13,
        6.43,
        -5.00,
        -5.00,
        6.85,
        25.20,
        8.30,
        10.00
    ])

    input_data = np.array([[pu, quantite, prix_revient, frais_pct, categorie_code]])

    model_name = "XGBoost"

    try:
        from xgboost import XGBRegressor

        model = XGBRegressor(
            n_estimators=80,
            max_depth=3,
            learning_rate=0.08,
            random_state=42
        )

        model.fit(x_train, y_train)
        marge_xgb = float(model.predict(input_data)[0])

    except Exception:
        model_name = "Random Forest fallback"

        model = RandomForestRegressor(
            n_estimators=100,
            random_state=42
        )

        model.fit(x_train, y_train)
        marge_xgb = float(model.predict(input_data)[0])

    # Correction métier :
    # on rapproche la prédiction IA du calcul économique réel
    # pour éviter une marge trop optimiste.
    marge_predite = (marge_xgb * 0.4) + (marge_theorique_pct * 0.6)

    difference = abs(marge_predite - marge_theorique_pct)
    score_confiance = max(0, min(100, 100 - difference * 5))

    if marge_predite < 0:
        niveau = "Déficitaire"
        decision = "Réviser avant validation"
        message = "La marge prédite est négative. Le devis présente un risque financier."
    elif marge_predite < 10:
        niveau = "Faible"
        decision = "Valider avec prudence"
        message = "La marge prédite est faible. Le devis reste rentable mais doit être contrôlé."
    elif marge_predite < 25:
        niveau = "Acceptable"
        decision = "Validable avec contrôle"
        message = "La marge prédite est acceptable mais doit être contrôlée."
    else:
        niveau = "Bonne"
        decision = "Validable"
        message = "Le devis présente une bonne rentabilité prévisionnelle."

    return {
        "success": True,
        "model": model_name,
        "marge_predite_pct": round(marge_predite, 2),
        "marge_theorique_pct": round(marge_theorique_pct, 2),
        "marge_xgboost_pct": round(marge_xgb, 2),
        "niveau": niveau,
        "decision": decision,
        "score_confiance": round(score_confiance, 2),
        "message": message,
        "input": {
            "pu_fcfa": pu,
            "quantite": quantite,
            "prix_revient_fcfa": prix_revient,
            "frais_gestion_pct": frais_pct,
            "categorie_code": categorie_code
        }
    }

# =========================
# MODULE NLP — ANALYSE SÉMANTIQUE
# =========================

@app.post("/semantic-analysis")
def semantic_analysis(payload: SemanticRequest):
    lignes = payload.lignes
    n_clusters = int(payload.n_clusters or 6)

    if not lignes:
        return {
            "success": False,
            "message": "Aucune ligne fournie pour l’analyse sémantique.",
            "totalLignes": 0,
            "nombreClusters": 0,
            "nombreOutliers": 0,
            "clusters": [],
            "outliers": [],
            "results": [],
            "model": "Sentence Transformers + KMeans + DBSCAN"
        }

    textes = []

    for ligne in lignes:
        texte = f"""
        {ligne.section or ''}
        {ligne.designation or ''}
        {ligne.categorie or ''}
        {ligne.sousCategorie or ''}
        {ligne.unite or ''}
        """
        textes.append(texte.strip())

    embeddings = nlp_model.encode(textes)

    n_clusters = max(2, min(n_clusters, len(lignes)))

    # =========================
    # KMEANS
    # =========================

    kmeans = KMeans(
        n_clusters=n_clusters,
        random_state=42,
        n_init=10
    )

    kmeans_labels = kmeans.fit_predict(embeddings)

    # =========================
    # DBSCAN
    # =========================
    # eps peut être ajusté entre 0.45 et 0.75 selon tes données.
    # Plus eps est petit, plus DBSCAN détecte d'isolés.
    # Plus eps est grand, moins il détecte d'isolés.

    dbscan = DBSCAN(
        eps=0.55,
        min_samples=2,
        metric="cosine"
    )

    dbscan_labels = dbscan.fit_predict(embeddings)

    # =========================
    # SIMILARITÉS
    # =========================

    similarity_matrix = cosine_similarity(embeddings)

    results = []

    for i, ligne in enumerate(lignes):
        pu_i = float(ligne.puContratFcfaArrondi or 0)
        marge_i = float(ligne.margeNettePct or 0)

        similar_items = []

        for j, other in enumerate(lignes):
            if i == j:
                continue

            similarite = float(similarity_matrix[i][j]) * 100

            if similarite >= 80:
                pu_j = float(other.puContratFcfaArrondi or 0)

                if pu_i > 0 and pu_j > 0:
                    ecart_prix_pct = abs(pu_i - pu_j) / max(pu_i, pu_j) * 100
                else:
                    ecart_prix_pct = 0

                if ecart_prix_pct >= 40:
                    decision = "Écart prix élevé"
                elif ecart_prix_pct >= 20:
                    decision = "À contrôler"
                else:
                    decision = "Cohérent"

                similar_items.append({
                    "id": other.id,
                    "categorie": other.categorie,
                    "sousCategorie": other.sousCategorie,
                    "puContratFcfaArrondi": pu_j,
                    "margeNettePct": float(other.margeNettePct or 0),
                    "similarite": round(similarite, 2),
                    "ecartPrixPct": round(ecart_prix_pct, 2),
                    "decision": decision
                })

        similar_items = sorted(
            similar_items,
            key=lambda x: x["similarite"],
            reverse=True
        )[:3]

        is_outlier = dbscan_labels[i] == -1

        results.append({
            "id": ligne.id,
            "section": ligne.section,
            "designation": ligne.designation,
            "categorie": ligne.categorie,
            "sousCategorie": ligne.sousCategorie,
            "unite": ligne.unite,
            "puContratFcfaArrondi": pu_i,
            "montantFcfa": float(ligne.montantFcfa or 0),
            "margeNettePct": marge_i,
            "clusterKMeans": int(kmeans_labels[i]),
            "cluster": int(kmeans_labels[i]),
            "dbscanLabel": int(dbscan_labels[i]),
            "isOutlier": bool(is_outlier),
            "similarItems": similar_items
        })

    # =========================
    # GROUPER PAR CLUSTER
    # =========================

    clusters = []

    for cluster_id in sorted(set(kmeans_labels)):
        items = [
            item for item in results
            if item["clusterKMeans"] == int(cluster_id)
        ]

        clusters.append({
            "cluster": int(cluster_id),
            "count": len(items),
            "items": items
        })

    outliers = [
        item for item in results
        if item["isOutlier"]
    ]

    return {
        "success": True,
        "model": "Sentence Transformers + KMeans + DBSCAN",
        "totalLignes": len(results),
        "nombreClusters": len(clusters),
        "nombreOutliers": len(outliers),
        "clusters": clusters,
        "outliers": outliers,
        "results": results
    }

# =========================
# LANCEMENT
# =========================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)