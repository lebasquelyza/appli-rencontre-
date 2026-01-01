import React, { useMemo, useRef, useState } from "react";

export function FiltersBar({ filters, onChange, onReset }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.sport) n += 1;
    if (filters.level) n += 1;
    if (filters.city && filters.city.trim()) n += 1;
    return n;
  }, [filters]);

  const toggle = () => setIsOpen((v) => !v);

  // hauteur dynamique pour un slide propre (sans “jump”)
  const panelStyle = useMemo(() => {
    const el = panelRef.current;
    const h = el ? el.scrollHeight : 0;
    return {
      maxHeight: isOpen ? `${h}px` : "0px"
    };
  }, [isOpen, filters]); // filters pour recalculer si contenu change

  return (
    <div className="filters">
      <div className="filters-top">
        <div className="filters-title">
          <h2>Explorer</h2>
          <span>Trouve ton match sportif.</span>
        </div>

        <div className="filters-actions">
          {activeCount > 0 ? (
            <button type="button" className="btn-ghost btn-sm" onClick={onReset}>
              Reset ({activeCount})
            </button>
          ) : null}

          <button
            type="button"
            className="btn-ghost btn-sm filters-toggle"
            onClick={toggle}
            aria-expanded={isOpen}
            aria-controls="filters-panel"
          >
            Filtrer par {activeCount > 0 ? `· ${activeCount}` : ""}{" "}
            <span className={`chev ${isOpen ? "up" : ""}`}>⌄</span>
          </button>
        </div>
      </div>

      {!isOpen && activeCount > 0 && (
        <div className="filters-summary">
          {filters.sport ? <span className="chip chip-soft">🏅 {filters.sport}</span> : null}
          {filters.level ? <span className="chip chip-soft">🎚️ {filters.level}</span> : null}
          {filters.city && filters.city.trim() ? (
            <span className="chip chip-soft">📍 {filters.city.trim()}</span>
          ) : null}
        </div>
      )}

      {/* Wrapper animé */}
      <div
        className={`filters-panelWrap ${isOpen ? "open" : ""}`}
        style={panelStyle}
        id="filters-panel"
      >
        <div ref={panelRef} className="filters-panel">
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
                <option value="Autre">Autre sport</option>
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

          <div className="filters-panel-bottom">
            <button type="button" className="btn-ghost btn-sm" onClick={onReset}>
              Réinitialiser
            </button>
            <button type="button" className="btn-primary btn-sm" onClick={() => setIsOpen(false)}>
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
