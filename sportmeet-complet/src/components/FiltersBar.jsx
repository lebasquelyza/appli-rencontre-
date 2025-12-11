import React from "react";

export function FiltersBar({ filters, onChange, onReset }) {
  return (
    <div className="filters">
      <div className="filters-header">
        <div className="filters-title">
          <h2>Explorer les sportifs</h2>
          <span>Filtre par sport, niveau, ville ou mot-clé.</span>
        </div>
        <div className="filters-actions">
          <button type="button" className="btn-secondary" onClick={onReset}>
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="filters-grid">
        <div className="form-group">
          <label htmlFor="filter-sport">Sport</label>
          <select
            id="filter-sport"
            value={filters.sport}
            onChange={(e) => onChange({ sport: e.target.value })}
          >
            <option value="">Tous</option>
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
          <label htmlFor="filter-level">Niveau</label>
          <select
            id="filter-level"
            value={filters.level}
            onChange={(e) => onChange({ level: e.target.value })}
          >
            <option value="">Tous</option>
            <option value="Débutant">Débutant</option>
            <option value="Intermédiaire">Intermédiaire</option>
            <option value="Confirmé">Confirmé</option>
            <option value="Expert">Expert</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="filter-city">Ville</label>
          <input
            id="filter-city"
            type="text"
            value={filters.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Ex : Paris"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="filter-search">Recherche libre</label>
        <div className="search-input-wrapper">
          <input
            id="filter-search"
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Nom, bio, disponibilité…"
          />
          <span className="search-icon">⌕</span>
        </div>
      </div>
    </div>
  );
}
