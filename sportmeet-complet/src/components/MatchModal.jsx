import React from "react";

export function MatchModal({ profile, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Entrer en contact</h3>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
        <div className="modal-body">
          <p>
            Dans cette version démo, la messagerie temps réel n&apos;est pas encore
            branchée. Voici comment tu pourrais l&apos;implémenter dans une vraie version :
          </p>
          <ul>
            <li>Créer un système de compte &amp; authentification (Supabase, Firebase…)</li>
            <li>Permettre l&apos;envoi de messages privés entre profils matchés</li>
            <li>Optionnel : notifications email ou push</li>
          </ul>
          <p>
            Tu peux utiliser ce texte pour ton futur pitch :
            <br />
            <br />
            <em>
              &quot;Je t&apos;ai trouvé sur SportMeet, une app de mise en relation entre
              sportifs de la même ville. Ça te dit une session {profile.sport.toLowerCase()} ?&quot;
            </em>
          </p>
        </div>
        <div className="modal-footer">
          <span>MVP front — backend à connecter</span>
        </div>
      </div>
    </div>
  );
}
