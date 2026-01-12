import React from "react";
import { useNavigate } from "react-router-dom";

export function DeleteAccount() {
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
            <h1 style={{ margin: 0 }}>Supprimer le compte / les données</h1>
          </div>

          <p style={{ marginTop: 12 }}>
            Vous pouvez supprimer vos données directement depuis l’application.
          </p>

          <h2>1) Supprimer votre profil MatchFit (dans l’app)</h2>
          <ol>
            <li>Ouvrez le menu <strong>Compte</strong></li>
            <li>Allez sur <strong>Mon profil</strong></li>
            <li>Cliquez sur <strong>Supprimer</strong></li>
            <li>Confirmez la suppression</li>
          </ol>

          <p>
            Cette action supprime votre <strong>profil</strong> et vos <strong>photos</strong> liées
            au profil (stockage).
          </p>

          <h2>2) Suppression complète (compte d’authentification)</h2>
          <p>
            MatchFit utilise un compte d’authentification (email) pour vous connecter. Selon la
            configuration technique, la suppression totale du compte peut nécessiter une action
            côté support.
          </p>

          <p style={{ marginTop: 10 }}>
            Pour demander une suppression complète (compte + données), contactez le support :
            <br />
            <strong>Email :</strong> sportifandpro@gmail.com
          </p>

          <p style={{ marginTop: 10, opacity: 0.9 }}>
            Indiquez l’email de votre compte dans votre demande. Nous traiterons la suppression
            dès que possible.
          </p>

          <h2>3) Délais</h2>
          <p>
            La suppression du profil est immédiate. Les sauvegardes techniques peuvent persister
            un temps limité selon nos obligations et contraintes de sécurité.
          </p>

          <p style={{ opacity: 0.8, marginBottom: 0 }}>Dernière mise à jour : 12/01/2026</p>
        </section>
      </div>
    </main>
  );
}
