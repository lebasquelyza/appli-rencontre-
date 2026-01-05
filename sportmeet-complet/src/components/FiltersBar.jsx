import React, { useMemo, useRef, useState } from "react";

export function FiltersBar({ filters, onChange, onReset }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  // ✅ état local pour géoloc
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);

  const radiusKm = Number(filters.radiusKm || 0);
  const hasRadius = radiusKm > 0;

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.sport) n += 1;
    if (filters.level) n += 1;
    if (filters.city && filters.city.trim()) n += 1;
    if (hasRadius) n += 1; // ✅ km autour de moi
    return n;
  }, [filters, hasRadius]);

  const toggle = () => setIsOpen((v) => !v);

  // hauteur dynamique pour un slide propre (sans “jump”)
  const panelStyle = useMemo(() => {
    const el = panelRef.current;
    const h = el ? el.scrollHeight : 0;
    return {
      maxHeight: isOpen ? `${h}px` : "0px"
    };
  }, [isOpen, filters]); // filters pour recalculer si contenu change

  const requestLocation = () => {
    setLocError(null);

    if (!navigator.geolocation) {
      setLocError("La géolocalisation n’est pas supportée par ton navigateur.");
      return;
    }

    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocLoading(false);
        onChange?.({
          myLocation: { lat: pos.coords.latitude, lon: pos.coords.longitude }
        });
      },
      () => {
        setLocLoading(false);
        setLocError("Permission refusée ou position indisponible.");
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

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
          {hasRadius ? (
            <span className="chip chip-soft">📏 {radiusKm} km</span>
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

            {/* ✅ Nouveau : Rayon KM autour de moi */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="filter-radius">
                Autour de moi : {radiusKm} km
              </label>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  id="filter-radius"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={radiusKm}
                  onChange={(e) => onChange({ radiusKm: Number(e.target.value) })}
                  style={{ width: "100%" }}
                />

                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={requestLocation}
                  disabled={locLoading}
                  title="Utiliser ma position"
                  aria-label="Utiliser ma position"
                >
                  {locLoading ? "..." : "📍"}
                </button>
              </div>

              <small style={{ display: "block", marginTop: 6, opacity: 0.8 }}>
                Mets à 0 km pour désactiver le filtre.
              </small>

              {locError ? (
                <small style={{ display: "block", marginTop: 6 }} className="form-message error">
                  {locError}
                </small>
              ) : null}
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
