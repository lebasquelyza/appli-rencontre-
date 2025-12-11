# SportMeet

Application de rencontre entre sportifs (MVP front-end) prête à être déployée sur **Netlify** via **GitHub**.

## Fonctionnalités

- Création de profil sportif (nom, âge, ville, sport, niveau, disponibilités, bio)
- Liste de profils avec quelques profils de démonstration
- Filtres par sport, niveau et ville
- Stockage local du profil créé dans `localStorage`
- UI responsive simple et moderne

## Installation locale

```bash
npm install
npm run dev
```

Puis ouvre l'URL indiquée dans le terminal (généralement http://localhost:5173).

## Build pour la production

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`.

## Déploiement sur Netlify

1. Pousser ce projet sur GitHub
2. Sur Netlify, choisir **"Add new site" > "Import from Git"**
3. Sélectionner le repo GitHub
4. Laisser la commande de build `npm run build` et le dossier de publication `dist`
5. Lancer le déploiement

C'est tout 🎉
