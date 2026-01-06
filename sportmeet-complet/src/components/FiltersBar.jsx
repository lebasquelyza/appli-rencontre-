import React, { useMemo, useRef, useState } from "react";

export function FiltersBar({ filters, onChange, onReset }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);

  const radiusKm = Number(filters.radiusKm || 0);
  const hasRadius = radiusKm > 0;

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.sport) n += 1;
    if (filters.level) n += 1;
    if (filters.city && filters.city.trim()) n += 1;
    if (hasRadius) n += 1;
    return n;
  }, [filters, hasRadius]);

  const toggle = () => setIsOpen((v) => !v);

  const panelStyle = useMemo(() => {
    const el = panelRef.current;
    const h = el ? el.scrollHeight : 0;
    return { maxHeight: isOpen ? `${h}px` : "0px" };
  }, [isOpen, filters]);

  const reverseGeocodeCity = async (lat, lon) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&format=json&accept-language=fr`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return "";

    const data = await res.json();
    const addr = data?.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
    const country = addr.country || "";
    return city ? (country ? `${city}, ${country}` : city) : "";
  };

  // 📍 met la position + remplit "Ville", sans forcer le périmètre
  const handleAroundMeClick = () => {
    setLocError(null);

    if (!navigator.geolocation) {
      setLocError("La géolocalisation n’est pas supportée par ton navigateur.");
      return;
    }

    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          onChange?.({ myLocation: { lat, lon } });

          const cityText = await reverseGeocodeCity(lat, lon);
          if (cityText) onChange?.({ city: cityText });
        } catch (e) {
          console.error(e);
          setLocError("Impossible de déterminer ta ville automatiquement.");
        } finally {
          setLocLoading(false);
        }
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
          {hasRadius ? <span className="chip chip-soft">📏 {radiusKm} km</span> : null}
        </div>
      )}

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

            {/* ✅ Sélecteur KM + bouton 📍 (visuellement fiable) */}
            <div className="form-group">
              <label htmlFor="filter-radius">Autour de moi</label>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  id="filter-radius"
                  value={radiusKm}
                  onChange={(e) => onChange({ radiusKm: Number(e.target.value) })}
                  style={{ flex: 1 }}
                >
                  <option value={0}>Désactivé</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={15}>15 km</option>
                  <option value={20}>20 km</option>
                  <option value={30}>30 km</option>
                  <option value={40}>40 km</option>
                  <option value={50}>50 km</option>
                  <option value={75}>75 km</option>
                  <option value={100}>100 km</option>
                </select>

                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={handleAroundMeClick}
                  disabled={locLoading}
                  title="Autour de moi (détecter ma ville)"
                  aria-label="Autour de moi"
                >
                  {locLoading ? "..." : "📍"}
                </button>
              </div>

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
