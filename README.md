# Boussole V0 — version simple à mettre en ligne

Cette version a été volontairement aplatie : aucun dossier interne n'est nécessaire.

Fichiers à envoyer ensemble sur GitHub :
- package.json
- server.js
- system-prompt.txt
- index.html
- README.md

Déploiement prévu : Render, service Node.
Commande de démarrage : `npm start`
Variables à configurer sur Render :
- `OPENAI_API_KEY`
- `OPENAI_MODEL` = `gpt-6-sol` (facultatif, c'est déjà la valeur par défaut)

La clé API ne doit jamais être placée dans GitHub.
