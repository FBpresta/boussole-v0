# Boussole V0 — application web

Première implémentation complète du cahier produit.

## Ce qui fonctionne
- conversation libre, sans banque de questions dans le frontend ;
- moteur LLM côté serveur ;
- sortie structurée + carte Boussole persistante ;
- traitement explicite de « je ne sais pas » ;
- modes comprendre / répondre / questionner / rechercher / challenger / expérience / apprentissage / direction / retrait ;
- recherche web déclenchée uniquement si le moteur identifie une inconnue factuelle externe ;
- expérience en attente conservée dans la carte ;
- diagnostic de routage visible pendant les tests ;
- sessions persistées localement dans `data/sessions.json`.

## Lancer localement
1. Installer Node.js 20+.
2. Dans ce dossier : `npm install`
3. Copier `.env.example` vers `.env`
4. Mettre votre clé dans `OPENAI_API_KEY`.
5. `npm start`
6. Ouvrir `http://localhost:3000`

La clé API reste côté serveur.

## Déployer
Le projet est volontairement standard : un service Node persistant suffit. Définir `OPENAI_API_KEY`, `OPENAI_MODEL` et lancer `npm start`. Pour une vraie mise en production, remplacer le fichier JSON par PostgreSQL/SQLite géré, ajouter authentification, chiffrement et politique de rétention.

## Test prioritaire
Commencer par :
« Mon travail, je ne sais plus quoi faire et surtout quelle direction prendre. »

Puis répondre naturellement, y compris « je ne sais pas ». Le diagnostic doit montrer un changement de source de connaissance plutôt qu'une reformulation automatique.

## Important
Cette V0 vise à tester le comportement du produit, pas l'identité visuelle finale.
