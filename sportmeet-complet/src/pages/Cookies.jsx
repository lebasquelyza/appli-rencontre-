// sportmeet-complet/src/pages/Cookies.jsx
import React from "react";

export function Cookies() {
  return (
    <main className="page">
      <div className="shell">
        <section className="card" style={{ padding: 16 }}>
          <h1 style={{ marginTop: 0 }}>Politique de cookies</h1>

          <p>
            Cette page explique comment SportMeet utilise des cookies et technologies similaires
            (stockage local, tokens, etc.) pour faire fonctionner l’Application.
          </p>

          <h2>1. Qu’est-ce qu’un cookie ?</h2>
          <p>
            Un cookie est un petit fichier déposé sur votre appareil. D’autres technologies
            similaires existent (ex. localStorage) et servent à mémoriser des informations.
          </p>

          <h2>2. Cookies/stockages essentiels (obligatoires)</h2>
          <p>
            L’Application utilise des éléments strictement nécessaires au fonctionnement, par
            exemple pour :
          </p>
          <ul>
            <li>vous authentifier et maintenir votre session (ex. via Supabase) ;</li>
            <li>sécuriser l’accès et prévenir les abus ;</li>
            <li>faire fonctionner les fonctionnalités principales (profil, upload, etc.).</li>
          </ul>
          <p>
            Ces éléments sont indispensables : sans eux, l’Application ne peut pas fonctionner
            correctement.
          </p>

          <h2>3. Cookies de mesure d’audience (facultatifs)</h2>
          <p>
            Si vous ajoutez plus tard un outil d’analyse (analytics), des cookies facultatifs
            peuvent être déposés afin de mesurer l’audience et améliorer l’Application.
            <br />
            <em>
              À ce jour, si vous n’avez pas intégré d’analytics, il n’y a pas de cookies
              publicitaires ni de tracking marketing.
            </em>
          </p>

          <h2>4. Gestion des cookies</h2>
          <p>
            Vous pouvez configurer votre navigateur pour refuser ou supprimer les cookies.
            Attention : le refus des cookies essentiels peut empêcher l’utilisation de
            l’Application.
          </p>

          <h2>5. Mise à jour de la politique</h2>
          <p>
            Cette politique peut évoluer, notamment si de nouveaux services (analytics,
            publicité, etc.) sont ajoutés.
          </p>

          <p style={{ opacity: 0.8, marginBottom: 0 }}>
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
          </p>
        </section>
      </div>
    </main>
  );
}
