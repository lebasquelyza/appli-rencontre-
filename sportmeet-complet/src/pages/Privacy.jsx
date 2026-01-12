import React from "react";
import { useNavigate } from "react-router-dom";

export function Privacy() {
  const navigate = useNavigate();

  return (
    <main className="page">
      <div className="shell">
        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn-ghost"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            >
              ← Retour
            </button>
            <h1 style={{ margin: 0 }}>Politique de confidentialité</h1>
          </div>

          <p style={{ marginTop: 12 }}>
            Cette politique explique comment MatchFit collecte, utilise et protège vos données
            lorsque vous utilisez l’application.
          </p>

          <h2>1. Données collectées</h2>
          <ul>
            <li>
              <strong>Données de compte</strong> : email (via authentification Supabase).
            </li>
            <li>
              <strong>Données de profil</strong> : nom/pseudo, âge, genre, ville, sport, niveau,
              disponibilités, bio, photos.
            </li>
            <li>
              <strong>Données techniques</strong> : informations nécessaires au fonctionnement
              (session, sécurité, logs techniques en cas d’erreur).
            </li>
            <li>
              <strong>Localisation</strong> : uniquement si vous l’autorisez, pour calculer des
              distances/proximités.
            </li>
          </ul>

          <h2>2. Finalités (pourquoi on utilise ces données)</h2>
          <ul>
            <li>Créer et gérer votre compte et votre profil.</li>
            <li>Permettre la mise en relation (affichage de profils, filtres, proximité).</li>
            <li>Sécuriser la plateforme et prévenir les abus.</li>
            <li>Améliorer l’application (diagnostic de bugs, performance).</li>
          </ul>

          <h2>3. Base légale</h2>
          <p>
            Les traitements sont fondés sur l’exécution du service (fournir l’application),
            votre consentement (ex. localisation si activée) et notre intérêt légitime (sécurité
            et prévention des abus).
          </p>

          <h2>4. Partage des données</h2>
          <p>
            Vos données sont traitées via des services techniques nécessaires au fonctionnement :
            <strong> Supabase</strong> (authentification, base de données et stockage des photos).
            Nous ne vendons pas vos données.
          </p>

          <h2>5. Contenu public dans l’application</h2>
          <p>
            Votre profil (pseudo/nom, sport, ville, bio, photos) est visible par les autres
            utilisateurs de MatchFit afin de permettre la mise en relation.
          </p>

          <h2>6. Conservation</h2>
          <p>
            Les données sont conservées tant que votre compte est actif. En cas de suppression,
            nous supprimons ou anonymisons les données dans la limite de nos obligations légales
            et techniques.
          </p>

          <h2>7. Vos droits</h2>
          <ul>
            <li>Accès, rectification, suppression.</li>
            <li>Opposition et limitation dans certains cas.</li>
            <li>Portabilité lorsque applicable.</li>
          </ul>
          <p>
            Pour exercer vos droits : utilisez la page <strong>Supprimer compte</strong> ou
            contactez le support indiqué dans l’application.
          </p>

          <h2>8. Sécurité</h2>
          <p>
            Nous mettons en place des mesures raisonnables pour protéger vos données (contrôles
            d’accès, règles de sécurité côté base, etc.). Aucun système n’est toutefois
            infaillible.
          </p>

          <h2>9. Modifications</h2>
          <p>Cette politique peut évoluer. La version affichée dans l’application fait foi.</p>

          <p style={{ opacity: 0.8, marginBottom: 0 }}>Dernière mise à jour : 12/01/2026</p>
        </section>
      </div>
    </main>
  );
}
