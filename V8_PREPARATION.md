# Boussole V8 — préparation isolée

Cette branche est réservée à V8. Ne pas la fusionner dans main et ne pas remplacer le service Render boussole-v0.

État vérifié le 14 octobre 2026 :
- Branche GitHub de travail séparée de main.
- Base PostgreSQL de test Render : boussole-v8-test-db (Frankfurt, plan gratuit, expiration 13 novembre 2026).
- Code consolidé V8 encore hors dépôt : le présent dépôt ne contient PAS encore V8.
- 49 tests locaux réussis sur l'archive V8, mais aucun test PostgreSQL, OpenAI ou navigateur réel effectué.
- La version V8 exige DATABASE_URL, OPENAI_API_KEY, BETA_INVITE_CODE, NODE_ENV=production, TRUST_PROXY=1.
- Ne jamais publier les secrets, ni le code d'invitation.
- Le modèle par défaut du code V8 ("gpt-6-sol") doit être remplacé par un modèle API effectivement accessible et validé avant test.
- L'application doit être hébergée sur un second service Render lié uniquement à cette branche et à sa base de test.
- Les essais doivent vérifier l'isolement entre comptes, l'archivage, les exports, la persistance, les erreurs API, et la gouvernance des phases.
- Une base gratuite expirante n'est pas adaptée à la conservation durable de données personnelles.

Aucune mise en ligne V8 n'est revendiquée par ce document.
