import React, { useEffect, useRef, useState } from "react";

const defaultForm = {
  name: "",
  age: "",
  city: "",
  sport: "",
  otherSport: "",
  level: "",
  availability: "",
  bio: ""
};

function loadGooglePlaces(apiKey) {
  return new Promise((resolve, reject) => {
    if (!apiKey) return reject(new Error("Missing Google Maps API key"));
    if (window.google?.maps?.places) return resolve(true);

    // Évite de charger 2 fois
    const existing = document.querySelector('script[data-google-maps="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => reject(new Error("Google Maps script load error")));
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&language=fr`;

    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Google Maps script load error"));
    document.head.appendChild(script);
  });
}

export function ProfileForm({ onCreateProfile }) {
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const cityInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Google Places Autocomplete (villes)
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    let cancelled = false;

    const initAutocomplete = async () => {
      try {
        await loadGooglePlaces(apiKey);
        if (cancelled) return;
        if (!cityInputRef.current) return;

        // Ne pas ré-instancier
        if (autocompleteRef.current) return;

        const ac = new window.google.maps.places.Autocomplete(cityInputRef.current, {
          types: ["(cities)"]
        });

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();

          // On préfère une valeur simple : "Ville, Pays"
          const formatted =
            place?.formatted_address ||
            place?.name ||
            cityInputRef.current?.value ||
            "";

          setForm((prev) => ({ ...prev, city: formatted }));
        });

        autocompleteRef.current = ac;
      } catch {
        // Si la clé est absente ou le script ne charge pas, on ignore :
        // le champ reste utilisable en saisie manuelle + bouton 📍
      }
    };

    initAutocomplete();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Bouton "utiliser ma position" => reverse geocoding (OpenStreetMap Nominatim)
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setIsError(true);
      setMessage("La géolocalisation n’est pas supportée par ton navigateur.");
      return;
    }

    setLoadingLocation(true);
    setIsError(false);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Nominatim (gratuit) — ajoute un param "email" recommandé pour l’identification
          // (mets une adresse générique si tu veux, ou laisse vide)
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=fr`;

          const res = await fetch(url, {
            headers: {
              "Accept": "application/json"
            }
          });

          if (!res.ok) throw new Error("Reverse geocoding failed");

          const data = await res.json();
          const addr = data?.address || {};

          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.county ||
            "";

          // si on a aussi un "state" / "country", on peut enrichir légèrement
          const country = addr.country || "";
          const finalText = city ? (country ? `${city}, ${country}` : city) : "";

          if (!finalText) {
            setIsError(true);
            setMessage("Je n’ai pas réussi à déterminer ta ville. Tu peux la saisir manuellement.");
          } else {
            setForm((prev) => ({ ...prev, city: finalText }));
          }
        } catch (err) {
          console.error(err);
          setIsError(true);
          setMessage("Impossible de récupérer ta ville automatiquement. Essaie en manuel.");
        } finally {
          setLoadingLocation(false);
        }
      },
      () => {
        setLoadingLocation(false);
        setIsError(true);
        setMessage("Permission refusée ou position indisponible.");
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isOtherSport = form.sport === "Autre";
    const finalSport = isOtherSport ? (form.otherSport || "").trim() : form.sport;

    if (!form.name || !form.city || !finalSport || !form.level) {
      setIsError(true);
      setMessage(
        "Merci de remplir au minimum le prénom, la localisation, le sport (ou autre sport) et le niveau."
      );
      return;
    }

    try {
      setLoading(true);

      await onCreateProfile({
        ...form,
        sport: finalSport,
        age: form.age ? Number(form.age) : null
      });

      setForm(defaultForm);
      setIsError(false);
      setMessage("Profil créé ! Tu apparais maintenant dans MatchFit.");
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMessage("Erreur : impossible d’enregistrer le profil pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const isOtherSport = form.sport === "Autre";

  return (
    <>
      <h2 className="modalTitle">Créer ton profil</h2>
      <p className="card-subtitle">
        Remplis ton profil pour être visible des autres sportifs.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Prénom *</label>
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
            <label htmlFor="city">Localisation *</label>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                placeholder="Ex : Lyon"
                ref={cityInputRef}
              />

              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={handleUseMyLocation}
                disabled={loadingLocation}
                title="Utiliser ma position"
                aria-label="Utiliser ma position"
              >
                {loadingLocation ? "..." : "📍"}
              </button>
            </div>

            <small style={{ display: "block", marginTop: 6, opacity: 0.8 }}>
              Astuce : tape pour voir des suggestions, ou clique sur 📍.
            </small>
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
              <option value="Autre">Autre sport…</option>
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

        {isOtherSport && (
          <div className="form-group">
            <label htmlFor="otherSport">Autre sport (précise lequel) *</label>
            <input
              id="otherSport"
              name="otherSport"
              type="text"
              value={form.otherSport}
              onChange={handleChange}
              placeholder="Ex : Escalade, boxe, paddle…"
            />
          </div>
        )}

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

        <button type="submit" className="btn-primary btn-block" disabled={loading}>
          {loading ? "Enregistrement..." : "Enregistrer mon profil"}
        </button>

        <p className={`form-message ${message ? (isError ? "error" : "success") : ""}`}>
          {message}
        </p>
      </form>
    </>
  );
}
