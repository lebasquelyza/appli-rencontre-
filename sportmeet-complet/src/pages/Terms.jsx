// sportmeet-complet/src/pages/Terms.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export function Terms() {
  const navigate = useNavigate();

  return (
    <main className="page">
      <div className="shell">
        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-ghost" onClick={() => navigate("/settings")}>
              ← Retour
            </button>
            <h1 style={{ margin: 0 }}>Conditions d’utilisation</h1>
          </div>

          <p style={{ marginTop: 12 }}>
            Les présentes conditions d’utilisation (« Conditions ») régissent l’accès et
            l’utilisation de l’application SportMeet (l’« Application »).
          </p>

          <h2>1. Accès – Âge minimum</h2>
          <p>
            L’Application est réservée aux personnes âgées de <strong>16 ans et plus</strong>.
            Si vous indiquez un âge inférieur à 16 ans, votre accès est refusé et votre compte
            peut être bloqué.
          </p>

          <h2>2. Compte et exactitude des informations</h2>
          <p>
            Vous vous engagez à fournir des informations exactes (notamment l’âge) et à les
            maintenir à jour. Vous êtes responsable de l’activité réalisée depuis votre compte.
          </p>

          <h2>3. Profils, contenus et photos</h2>
          <p>
            Vous pouvez publier des informations de profil et des photos. Vous garantissez
            disposer de tous les droits nécessaires sur les contenus que vous publiez et vous
            engagez à ne pas publier de contenu :
          </p>
          <ul>
            <li>illégal, haineux, violent, harcelant, discriminatoire ou diffamatoire ;</li>
            <li>à caractère sexuel explicite ou impliquant des mineurs ;</li>
            <li>portant atteinte à la vie privée, à l’image ou aux droits d’autrui ;</li>
            <li>trompeur (usurpation d’identité, fausses informations, etc.).</li>
          </ul>

          <h2>4. Géolocalisation</h2>
          <p>
            L’Application peut utiliser la géolocalisation (si vous l’autorisez) pour améliorer
            l’expérience (ex. distance/proximité). Vous pouvez refuser ou retirer cette
            autorisation depuis les réglages de votre appareil.
          </p>

          <h2>5. Règles de conduite</h2>
          <p>
            Vous vous engagez à utiliser l’Application de manière respectueuse. Toute tentative
            de contournement des restrictions (ex. âge), de collecte automatisée (scraping),
            d’attaque, d’abus ou de spam est interdite.
          </p>

          <h2>6. Modération – Suspension / blocage</h2>
          <p>
            Nous pouvons, à tout moment, retirer un contenu, limiter des fonctionnalités,
            suspendre ou bloquer un compte en cas de non-respect des présentes Conditions,
            notamment en cas d’âge inférieur à 16 ans ou de contenu illicite.
          </p>

          <h2>7. Disponibilité et sécurité</h2>
          <p>
            Nous faisons de notre mieux pour assurer le bon fonctionnement de l’Application,
            sans garantie d’absence d’erreurs ou d’interruptions. Vous reconnaissez utiliser
            l’Application sous votre responsabilité.
          </p>

          <h2>8. Responsabilité</h2>
          <p>
            L’Application facilite des mises en relation entre utilisateurs. Nous ne sommes pas
            responsables des comportements, échanges, rencontres ou contenus publiés par les
            utilisateurs.
          </p>

          <h2>9. Propriété intellectuelle</h2>
          <p>
            L’Application, son design, ses éléments graphiques et son code (hors contenus
            publiés par les utilisateurs) sont protégés. Toute reproduction non autorisée est
            interdite.
          </p>

          <h2>10. Modifications</h2>
          <p>
            Nous pouvons modifier ces Conditions. La version applicable est celle affichée dans
            l’Application au moment de l’utilisation.
          </p>

          <h2>11. Contact</h2>
          <p>
            Pour toute question, vous pouvez nous contacter via le support de l’Application
            (ou l’adresse email indiquée dans le projet).
          </p>

          <p style={{ opacity: 0.8, marginBottom: 0 }}>
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
          </p>
        </section>
      </div>
    </main>
  );
}
