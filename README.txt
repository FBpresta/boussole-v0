BOUSSOLE V0.4.1 — CORRECTIF CIBLÉ

Remplacer :
- server.js
- system-prompt.txt
- index.html

Corrections :
1. La route RECHERCHER déclenche désormais réellement la recherche, même si le modèle a renvoyé un mode incohérent.
2. Une source de connaissance externe déclenche également la recherche.
3. Si la requête de recherche manque, le serveur fabrique un repli à partir de l'inconnue ciblée / du message.
4. Les logs affichent BOUSSOLE_PERF avec :
   routerMs, researchMs, synthesisMs, totalMs et researchTriggered.
5. Affichage V0.4.1.

But : corriger uniquement les deux défauts trouvés au crash-test sans modifier la carte vivante.
