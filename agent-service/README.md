# Targetalent Sourcing Agent — Python Service

Microservice d'IA de Sourcing basé sur **LangGraph**, **Groq (Llama 3.3 70B)**, **FastMCP** et **FastAPI**.

## Fonctionnalités
- **LangGraph Agent** : Workflow autonome à 4 nœuds (`interpret_request` → `search_profiles` → `score_profiles` → `format_output`).
- **FastMCP Tools** : Outils MCP de recherche et scoring de profils.
- **Scoring Hybride** : Similarité sémantique par embeddings locaux (`sentence-transformers`) + explication détaillée générée par LLM (Groq/Llama).
- **Fallback Data** : Base de données de profils synthétiques très réalistes pour tests et démos sans clé SerpAPI.

## Démarrage rapide

```bash
# 1. Copier l'environnement
cp .env.example .env

# 2. Renseigner la clé API Groq
# GROQ_API_KEY=gsk_...

# 3. Lancer l'application
python -m uvicorn src.main:app --reload --port 8001
```
