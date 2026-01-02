import { useState } from "react";
import { supabase } from "../lib/supabase";

export function AuthModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("📧 Email envoyé ! Confirme ton adresse pour te connecter.");
    }
    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(error.message);
    } else {
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Connexion</h3>
          <button className="btn-ghost" onClick={onClose}>Fermer</button>
        </div>

        <div className="modal-body form">
          <div className="form-group">
            <label>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button className="btn-primary btn-block" onClick={signIn} disabled={loading}>
            Connexion
          </button>

          <button className="btn-ghost btn-block" onClick={signUp} disabled={loading}>
            Créer un compte
          </button>

          {message && <p className="form-message">{message}</p>}
        </div>
      </div>
    </div>
  );
}
