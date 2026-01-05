// sportmeet-complet/src/components/ProfileForm.jsx
import React, { useEffect, useRef, useState } from "react";

const emptyForm = {
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

export function ProfileForm({ existingProfile, loadingExisting, onSaveProfile }) {
  const isEdit = !!existingProfile?.id;

  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Photos (nouveaux fichiers uniquement)
  const [photos, setPhotos] = useState([]); // File[]
  const [photoPreviews, setPhotoPreviews] = useState([]); // string[]
  const fileInputRef = useRef(null);

  // ✅ Photos existantes (urls) conservées en édition
  const [keptPhotoUrls, setKeptPhotoUrls] = useState([]); // string[]

  const cityInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // ✅ Pré-remplissage depuis le profil existant
  useEffect(() => {
    if (!existingProfile) {
      setForm(emptyForm);
      setPhotos([]);
      setKeptPhotoUrls([]);
      return;
    }

    setForm({
      name: existingProfile.name || "",
      age: existingProfile.age ?? "",
      city: existingProfile.city || "",
      sport: STANDARDIZE_SPORT(existingProfile.sport || ""),
      otherSport: isStandardSport(existingProfile.sport) ? "" : existingProfile.sport || "",
      level: existingProfile.level || "",
      availability: existingProfile.availability || "",
      bio: existingProfile.bio || ""
    });

    // reset photos locales + init photos existantes
    setPhotos([]);
    setKeptPhotoUrls(Array.isArray(existingProfile?.photo_urls) ? existingProfile.photo_urls : []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingProfile?.id]);

  // Preview URLs
  useEffect(() => {
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    const next = photos.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(next);

    return () => {
      next.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Google Places (optionnel)
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    let cancelled = false;

    const initAutocomplete = async () => {
      try {
        await loadGooglePlaces(apiKey);
        if (cancelled) return;
        if (!cityInputRef.current) return;
        if (autocompleteRef.current) return;

        const ac = new window.google.maps.places.Autocomplete(cityInputRef.current, {
          types: ["(cities)"]
        });

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted =
            place?.formatted_address || place?.name || cityInputRef.current?.value || "";
          setForm((prev) => ({ ...prev, city: formatted }));
        });

        autocompleteRef.current = ac;
      } catch {
        // ignore
      }
    };

    initAutocomplete();
    return () => {
      cancelled = true;
    };
  }, []);

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
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=fr`;

          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error("Reverse geocoding failed");

          const data = await res.json();
          const addr = data?.address || {};
          const city =
            addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
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

  const handlePhotosSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const imagesOnly = files.filter((f) => f.type.startsWith("image/"));

    // ✅ max 5 au total (photos existantes conservées + nouvelles)
    const remainingSlots = 5 - (keptPhotoUrls.length + photos.length);
    if (remainingSlots <= 0) {
      e.target.value = "";
      return;
    }

    const toAdd = imagesOnly.slice(0, remainingSlots);
    setPhotos((prev) => [...prev, ...toAdd]);

    e.target.value = "";
  };

  const removePhotoAt = (idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  // ✅ Retirer une photo existante (sans obliger à tout remplacer)
  const removeExistingPhotoAt = (idx) =>
    setKeptPhotoUrls((prev) => prev.filter((_, i) => i !== idx));

  const isOtherSport = form.sport === "Autre";

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalSport = isOtherSport ? (form.otherSport || "").trim() : form.sport;

    if (!form.name || !form.city || !finalSport || !form.level) {
      setIsError(true);
      setMessage("Merci de remplir au minimum le prénom, la localisation, le sport et le niveau.");
      return;
    }

    // ✅ en édition : photos facultatives (tu peux garder, supprimer, ou ajouter)
    // ✅ en création : App.jsx exigera 1 photo si profil n'existe pas

    try {
      setLoading(true);
      setIsError(false);
      setMessage(null);

      await onSaveProfile?.({
        ...form,
        sport: finalSport,
        age: form.age ? Number(form.age) : null,
        photos, // nouveaux fichiers (peut être vide)
        keptPhotoUrls // urls existantes à conserver (peut être vide)
      });

      setIsError(false);
      setMessage(isEdit ? "Profil mis à jour ✅" : "Profil créé ✅");

      // ✅ on vide seulement les nouvelles photos sélectionnées
      setPhotos([]);
    } catch (err) {
      console.error(err);
      setIsError(true);

      const msg = String(err?.message || "");

      if (msg.includes("AUTH_REQUIRED")) {
        setMessage("Connecte-toi pour enregistrer ton profil.");
      } else if (msg.includes("PHOTO_REQUIRED")) {
        setMessage("Ajoute au moins 1 photo pour créer ton profil.");
      } else if (msg.includes("MAX_5_PHOTOS")) {
        setMessage("Maximum 5 photos.");
      } else if (msg.includes("MISSING_FIELDS")) {
        setMessage("Merci de remplir les champs obligatoires.");
      } else {
        setMessage("Erreur : impossible d’enregistrer le profil pour le moment.");
      }
    } finally {
      setLoading(false);
    }
  };

  const totalPhotosCount = (isEdit ? keptPhotoUrls.length : 0) + photos.length;

  return (
    <>
      <h2 className="modalTitle">{isEdit ? "Modifier mon profil" : "Créer ton profil"}</h2>

      <p className="card-subtitle">
        {loadingExisting
          ? "Chargement de ton profil…"
          : isEdit
          ? "Tes infos sont sauvegardées. Modifie et enregistre."
          : "Ajoute au moins 1 photo (max 5) pour apparaître dans les profils."}
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
            disabled={loadingExisting}
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
              disabled={loadingExisting}
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
                disabled={loadingExisting}
              />
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={handleUseMyLocation}
                disabled={loadingLocation || loadingExisting}
                title="Utiliser ma position"
                aria-label="Utiliser ma position"
              >
                {loadingLocation ? "..." : "📍"}
              </button>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="form-group">
          <label>Photos {isEdit ? "(optionnel)" : "*"}</label>

          {/* ✅ Affichage des photos existantes en édition (conservées par défaut) */}
          {isEdit && keptPhotoUrls.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              {keptPhotoUrls.map((src, idx) => (
                <div key={`${src}-${idx}`} style={{ position: "relative" }}>
                  <img
                    src={src}
                    alt={`photo-existante-${idx + 1}`}
                    style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhotoAt(idx)}
                    className="btn-ghost btn-sm"
                    style={{ position: "absolute", top: -8, right: -8, borderRadius: 999 }}
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={totalPhotosCount >= 5 || loadingExisting}
            >
              {isEdit
                ? `Ajouter des photos (${totalPhotosCount}/5)`
                : `Ajouter une photo (${photos.length}/5)`}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotosSelected}
              style={{ display: "none" }}
            />
          </div>

          {!isEdit && photos.length === 0 && (
            <small style={{ display: "block", marginTop: 6, opacity: 0.8 }}>1 photo minimum.</small>
          )}

          {photoPreviews.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              {photoPreviews.map((src, idx) => (
                <div key={src} style={{ position: "relative" }}>
                  <img
                    src={src}
                    alt={`photo-${idx + 1}`}
                    style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhotoAt(idx)}
                    className="btn-ghost btn-sm"
                    style={{ position: "absolute", top: -8, right: -8, borderRadius: 999 }}
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-row-inline">
          <div className="form-group">
            <label htmlFor="sport">Sport principal *</label>
            <select
              id="sport"
              name="sport"
              value={form.sport}
              onChange={handleChange}
              disabled={loadingExisting}
            >
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
            <select
              id="level"
              name="level"
              value={form.level}
              onChange={handleChange}
              disabled={loadingExisting}
            >
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
              disabled={loadingExisting}
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
            disabled={loadingExisting}
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
            disabled={loadingExisting}
          />
        </div>

        <button type="submit" className="btn-primary btn-block" disabled={loading || loadingExisting}>
          {loading ? "Enregistrement..." : isEdit ? "Mettre à jour mon profil" : "Enregistrer mon profil"}
        </button>

        <p className={`form-message ${message ? (isError ? "error" : "success") : ""}`}>{message}</p>
      </form>
    </>
  );
}

/* Helpers */
function isStandardSport(sport) {
  return ["Running", "Fitness", "Football", "Basket", "Tennis", "Cyclisme", "Randonnée", "Natation", "Musculation"].includes(
    (sport || "").trim()
  );
}

function STANDARDIZE_SPORT(sport) {
  const s = (sport || "").trim();
  if (!s) return "";
  return isStandardSport(s) ? s : "Autre";
}
