import React, { useState } from "react";

const defaultForm = {
  name: "",
  age: "",
  city: "",
  sport: "",
  level: "",
  availability: "",
  bio: ""
};

export function ProfileForm({ onCreateProfile }) {
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.city || !form.sport || !form.level) {
      setIsError(true);
      setMessage("Merci de remplir au minimum le nom, la ville, le sport et le niveau.");
      return;
    }
    onCreateProfile({
      ...form,
      age: form.age ? Number(form.age) : null
    });
    setForm(defaultForm);
    setIsError(false);
    setMessage("Profil créé ! Tu apparais maintenant dans la liste de sportifs.");
  };

  return (
    <>
      <h2>Créer ton profil sportif</h2>
      <p className="card-subtitle">
        Remplis ton profil pour être visible des autres sportifs. Les données sont stockées
        seulement dans ton navigateur.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Prénom / Pseudo *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="Ex : Alex"
          />
        </div>

        <div className="form-row-inline">
          <div className="form-group">
            <label htmlFor="age">Âge</label>
            <input
              id="age"
              name="age"
              type="number"
              min="12"
              max="99"
              value={form.age}
              onChange={handleChange}
              placeholder="Ex : 28"
            />
          </div>
          <div className="form-group">
            <label htmlFor="city">Ville *</label>
            <input
              id="city"
              name="city"
              type="text"
              value={form.city}
              onChange={handleChange}
              placeholder="Ex : Lyon"
            />
          </div>
        </div>

        <div className="form-row-inline">
          <div className="form-group">
            <label htmlFor="sport">Sport principal *</label>
            <select id="sport" name="sport" value={form.sport} onChange={handleChange}>
              <option value="">Choisis un sport</option>
              <option value="Running">Running</option>
              <option value="Fitness">Fitness</option>
              <option value="Football">Football</option>
              <option value="Basket">Basket</option>
              <option value="Tennis">Tennis</option>
              <option value="Cyclisme">Cyclisme</option>
              <option value="Randonnée">Randonnée</option>
              <option value="Natation">Natation</option>
              <option value="Musculation">Musculation</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="level">Niveau *</label>
            <select id="level" name="level" value={form.level} onChange={handleChange}>
              <option value="">Choisis un niveau</option>
              <option value="Débutant">Débutant</option>
              <option value="Intermédiaire">Intermédiaire</option>
              <option value="Confirmé">Confirmé</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="availability">Disponibilités</label>
          <input
            id="availability"
            name="availability"
            type="text"
            value={form.availability}
            onChange={handleChange}
            placeholder="Ex : Soir en semaine, samedi matin…"
          />
        </div>

        <div className="form-group">
          <label htmlFor="bio">Quelques mots sur toi</label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            value={form.bio}
            onChange={handleChange}
            placeholder="Ex : Je cherche un partenaire de running 2x/semaine."
          />
        </div>

        <button type="submit" className="btn-primary">
          Enregistrer mon profil
        </button>

        <p
          className={`form-message ${
            message ? (isError ? "error" : "success") : ""
          }`}
        >
          {message}
        </p>
      </form>
    </>
  );
}
