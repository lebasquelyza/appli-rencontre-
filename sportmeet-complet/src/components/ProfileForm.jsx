// sportmeet-complet/src/components/ProfileForm.jsx
import React, { useEffect, useRef, useState } from "react";

const emptyForm = {
  name: "",
  age: "",
  height: "", // ✅ taille obligatoire (cm)
  gender: "",
  city: "",
  sport: "",
  otherSport: "",
  level: "",
  availability: "",
  bio: ""
};

export function ProfileForm({ existingProfile, loadingExisting, onSaveProfile, onDirtyChange }) {
  const isEdit = !!existingProfile?.id;

  const [form, setForm] = useState(emptyForm);

  // ✅ Photos: nouvelles (File) upload
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");

  // ✅ Photos existantes conservées (URLs)
  const [keptPhotoUrls, setKeptPhotoUrls] = useState([]);

  // ✅ previews (object urls) pour nouvelles photos
  const [photoPreviews, setPhotoPreviews] = useState([]);

  // ✅ Age: blocage si < 16
  const [ageError, setAgeError] = useState("");

  // ✅ Erreur submit (pour éviter "rien ne se passe")
  const [submitError, setSubmitError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // ✅ Position exacte
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [geoStatus, setGeoStatus] = useState("");

  // ✅ City confirm (Nominatim)
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityConfirmStatus, setCityConfirmStatus] = useState(""); // message UI
  const [cityConfirmed, setCityConfirmed] = useState(false);
  const debounceRef = useRef(null);

  const fileInputRef = useRef(null);

  // 🔐 référence état initial
  const initialRef = useRef(null);

  async function searchCities(q) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&accept-language=fr&q=${encodeURIComponent(
      q
    )}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function reverseGeocodeCity(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=fr&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  }

  function formatCityLabelFromAddress(address = {}) {
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.hamlet ||
      address.locality ||
      "";

    const department = address.county || address.state_district || address.state || "";
    const country = address.country || "";

    const parts = [city, department, country].map((x) => (x || "").trim()).filter(Boolean);
    return parts.join(", ");
  }

  function formatCityLabel(s) {
    return formatCityLabelFromAddress(s?.address || {}) || (s?.display_name ? String(s.display_name) : "");
  }

  /* -------------------------------
     Pré-remplissage
  -------------------------------- */
  useEffect(() => {
    // cleanup previews avant reset
    setPhotoPreviews((prev) => {
      prev.forEach((p) => {
        try {
          URL.revokeObjectURL(p.url);
        } catch {}
      });
      return [];
    });

    // cleanup recherche ville (debounce)
    window.clearTimeout(debounceRef.current);

    setSubmitError("");
    setSubmitLoading(false);
    setPhotoError("");
    setAgeError("");

    // reset ville confirm states
    setCitySuggestions([]);
    setCityLoading(false);
    setCityConfirmStatus("");
    setCityConfirmed(false);

    if (!existingProfile) {
      setForm(emptyForm);
      setPhotos([]);
      setKeptPhotoUrls([]);
      setCoords({ lat: null, lng: null });
      setGeoStatus("");

      initialRef.current = JSON.stringify({
        ...emptyForm,
        latitude: null,
        longitude: null,
        photo_urls: []
      });
      return;
    }

    const initial = {
      name: existingProfile.name || "",
      age: existingProfile.age ?? "",
      height: existingProfile.height ?? "", // ✅ NEW
      gender: existingProfile.gender ?? "",
      city: existingProfile.city || "",
      sport: existingProfile.sport || "",
      level: existingProfile.level || "",
      availability: existingProfile.availability || "",
      bio: existingProfile.bio || ""
    };

    setForm(initial);
    setPhotos([]);

    // ✅ photos déjà en base
    const existingUrls = Array.isArray(existingProfile.photo_urls) ? existingProfile.photo_urls : [];
    setKeptPhotoUrls(existingUrls);

    // ✅ si ton backend a déjà lat/lng, on les récupère, sinon null
    const lat = existingProfile.latitude ?? null;
    const lng = existingProfile.longitude ?? null;
    setCoords({ lat, lng });

    // ✅ en édition: ville considérée confirmée si déjà enregistrée
    if ((initial.city || "").trim().length > 0) {
      setCityConfirmed(true);
      setCityConfirmStatus("Ville confirmée ✅");
    }

    initialRef.current = JSON.stringify({
      ...initial,
      latitude: lat,
      longitude: lng,
      photo_urls: existingUrls
    });
  }, [existingProfile?.id]);

  /* -------------------------------
     Dirty detection
  -------------------------------- */
  useEffect(() => {
    if (!initialRef.current) return;

    const current = JSON.stringify({
      name: form.name,
      age: form.age,
      height: form.height, // ✅ NEW
      gender: form.gender,
      city: form.city,
      sport: form.sport,
      level: form.level,
      availability: form.availability,
      bio: form.bio,
      latitude: coords.lat,
      longitude: coords.lng,
      photo_urls: keptPhotoUrls
    });

    const dirty = current !== initialRef.current || photos.length > 0;
    onDirtyChange?.(dirty);
  }, [form, photos, coords, keptPhotoUrls, onDirtyChange]);

  // ✅ cleanup previews on unmount
  useEffect(() => {
    return () => {
      photoPreviews.forEach((p) => {
        try {
          URL.revokeObjectURL(p.url);
        } catch {}
      });
      window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "age") setAgeError("");

    if (name === "city") {
      // dès que l'utilisateur retape, on invalide la confirmation
      setCityConfirmed(false);
      setCityConfirmStatus("");
      setCitySuggestions([]);
      setGeoStatus("");
    }

    setForm((p) => ({ ...p, [name]: value }));
  };

  /* -------------------------------
     Autocomplete Ville (Nominatim) + confirmation
  -------------------------------- */
  useEffect(() => {
    const q = (form.city || "").trim();

    if (cityConfirmed) return;

    if (q.length < 3) {
      setCitySuggestions([]);
      setCityLoading(false);
      return;
    }

    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setCityLoading(true);
      try {
        const list = await searchCities(q);

        // ✅ dédupe: si le label affiché est identique, on ne le garde qu'une fois
        const seen = new Set();
        const deduped = [];
        for (const s of list) {
          const label = formatCityLabel(s);
          const key = (label || "").trim().toLowerCase();
          if (!key) continue;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(s);
        }

        setCitySuggestions(deduped);
      } catch (e) {
        console.error("searchCities error:", e);
        setCitySuggestions([]);
      } finally {
        setCityLoading(false);
      }
    }, 400);

    return () => window.clearTimeout(debounceRef.current);
  }, [form.city, cityConfirmed]);

  const confirmCityFromSuggestion = (s) => {
    const label = formatCityLabel(s) || form.city;

    setForm((p) => ({ ...p, city: label }));
    setCitySuggestions([]);
    setCityConfirmed(true);
    setCityConfirmStatus("Ville confirmée ✅");

    // ✅ coords cohérentes avec la ville choisie
    const lat = s?.lat != null ? Number(s.lat) : null;
    const lng = s?.lon != null ? Number(s.lon) : null;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setCoords({ lat, lng });
    }
  };

  // ✅ bouton 📍 : récupère position exacte + remplit automatiquement la ville
  const detectLocation = () => {
    setGeoStatus("");

    if (!navigator.geolocation) {
      setGeoStatus("Géolocalisation non supportée.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCoords({ lat, lng });

        // ✅ reverse geocoding => remplir automatiquement la ville
        try {
          const rev = await reverseGeocodeCity(lat, lng);
          const label = formatCityLabelFromAddress(rev?.address || {});
          if (label) setForm((p) => ({ ...p, city: label }));
        } catch (e) {
          console.error("reverseGeocodeCity error:", e);
        }

        setCityConfirmed(true);
        setCitySuggestions([]);
        setCityConfirmStatus("Ville confirmée ✅");
      },
      (err) => {
        if (err.code === 1) setGeoStatus("Autorisation refusée.");
        else setGeoStatus("Impossible de récupérer la position.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ✅ Photos: max 5 total (existantes conservées + nouvelles)
  const handlePhotosSelected = (e) => {
    setPhotoError("");

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const totalAlready = keptPhotoUrls.length + photos.length;
    const remaining = Math.max(0, 5 - totalAlready);
    const accepted = files.slice(0, remaining);

    if (accepted.length === 0) {
      setPhotoError("Maximum 5 photos.");
      e.target.value = "";
      return;
    }

    setPhotos((prev) => [...prev, ...accepted]);

    setPhotoPreviews((prev) => {
      const toAdd = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
        file,
        url: URL.createObjectURL(file)
      }));
      return [...prev, ...toAdd];
    });

    e.target.value = "";
  };

  // ✅ supprimer une photo NOUVELLE
  const removeNewPhotoAt = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const target = prev[index];
      if (target?.url) {
        try {
          URL.revokeObjectURL(target.url);
        } catch {}
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // ✅ supprimer une photo EXISTANTE (URL)
  const removeKeptPhotoAt = (index) => {
    setKeptPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();

    // reset UI errors
    setSubmitError("");
    setPhotoError("");

    const ageNum = form.age === "" ? NaN : Number(form.age);

    // ✅ Age obligatoire + blocage <16
    if (!Number.isFinite(ageNum)) {
      setAgeError("Merci d’indiquer ton âge.");
      return;
    }
    if (ageNum < 16) {
      setAgeError("Accès refusé : vous devez avoir 16 ans ou plus.");
      return;
    }

    // ✅ Taille obligatoire (cm)
    const heightNum = form.height === "" ? NaN : Number(form.height);
    if (!Number.isFinite(heightNum)) {
      setSubmitError("Merci d’indiquer ta taille.");
      return;
    }
    if (heightNum < 80 || heightNum > 250) {
      setSubmitError("Merci d’indiquer une taille valide (en cm).");
      return;
    }

    // ✅ 1 photo obligatoire (TOTAL)
    const totalPhotosCount = keptPhotoUrls.length + photos.length;
    if (totalPhotosCount < 1) {
      setPhotoError("Au moins 1 photo est obligatoire.");
      return;
    }

    // ✅ max 5 sécurité
    if (totalPhotosCount > 5) {
      setPhotoError("Maximum 5 photos.");
      return;
    }

    // ✅ ville doit être confirmée (par liste OU GPS)
    if (!cityConfirmed) {
      setSubmitError("Merci de confirmer ta ville (sélectionne-la dans la liste ou utilise 📍).");
      return;
    }

    setSubmitLoading(true);
    try {
      await onSaveProfile({
        ...form,
        age: form.age ? Number(form.age) : null,
        height: form.height ? Number(form.height) : null,
        gender: form.gender || null,

        // ✅ position exacte / ville choisie
        latitude: coords.lat,
        longitude: coords.lng,

        // ✅ important pour l’édition
        keptPhotoUrls: isEdit ? keptPhotoUrls : [],

        // ✅ nouvelles photos à uploader
        photos
      });

      onDirtyChange?.(false);
    } catch (err) {
      console.error(err);

      const msg = err?.message || "";
      const supa =
        err?.message ||
        err?.error_description ||
        err?.details ||
        err?.hint ||
        (typeof err === "string" ? err : "");

      if (msg === "AUTH_REQUIRED") setSubmitError("Connecte-toi pour enregistrer ton profil.");
      else if (msg === "MISSING_FIELDS") setSubmitError("Merci de remplir tous les champs obligatoires.");
      else if (msg === "PHOTO_REQUIRED") setSubmitError("Ajoute au moins une photo.");
      else if (msg === "AGE_REQUIRED") setSubmitError("Merci d’indiquer ton âge.");
      else if (msg === "UNDER_16_BLOCKED") setSubmitError("Tu dois avoir 16 ans ou plus.");
      else if (msg === "MAX_5_PHOTOS") setSubmitError("Maximum 5 photos.");
      else if (msg === "HEIGHT_REQUIRED") setSubmitError("Merci d’indiquer ta taille.");
      else if (msg === "HEIGHT_INVALID") setSubmitError("Merci d’indiquer une taille valide (80 à 250 cm).");
      else setSubmitError(String(supa || "Impossible d’enregistrer pour le moment. Réessaie."));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-group">
        <label>Prénom *</label>
        <input name="name" value={form.name} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Âge *</label>
        <input name="age" type="number" min="0" inputMode="numeric" value={form.age} onChange={handleChange} />
        {ageError && <div style={{ marginTop: 8, color: "tomato" }}>{ageError}</div>}
      </div>

      {/* ✅ Taille obligatoire */}
      <div className="form-group">
        <label>Taille (cm) *</label>
        <input
          name="height"
          type="number"
          min="80"
          max="250"
          inputMode="numeric"
          value={form.height}
          onChange={handleChange}
          required
          placeholder="ex: 175"
        />
      </div>

      {/* ✅ Bouton Sexe (Femme / Homme / Autres) */}
      <div className="form-group">
        <label>Sexe *</label>
        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="">Sélectionner…</option>
          <option value="female">Femme</option>
          <option value="male">Homme</option>
          <option value="other">Autres</option>
        </select>
      </div>

      <div className="form-group">
        <label>Ville *</label>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input name="city" value={form.city} onChange={handleChange} style={{ flex: 1 }} />
          <button
            type="button"
            className="btn-ghost"
            onClick={detectLocation}
            title="Détecter ma position"
            aria-label="Détecter ma position"
            style={{ paddingInline: 10 }}
          >
            📍
          </button>
        </div>

        {!cityConfirmed ? (
          <small style={{ display: "block", marginTop: 6, opacity: 0.85 }}>
            {cityLoading ? "Recherche de la ville…" : "Sélectionne la bonne ville dans la liste pour confirmer (ou utilise 📍)."}
          </small>
        ) : cityConfirmStatus ? (
          <small style={{ display: "block", marginTop: 6, opacity: 0.85 }}>{cityConfirmStatus}</small>
        ) : null}

        {citySuggestions.length > 0 && !cityConfirmed && (
          <div className="card" style={{ marginTop: 8, padding: 8, display: "grid", gap: 6 }}>
            {citySuggestions.map((s) => (
              <button
                key={s.place_id}
                type="button"
                className="btn-ghost"
                style={{ textAlign: "left", padding: 8 }}
                onClick={() => confirmCityFromSuggestion(s)}
              >
                {formatCityLabel(s)}
              </button>
            ))}
          </div>
        )}

        {geoStatus ? <small style={{ display: "block", marginTop: 6, opacity: 0.85 }}>{geoStatus}</small> : null}
      </div>

      <div className="form-group">
        <label>Sport *</label>
        <input name="sport" value={form.sport} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Niveau *</label>
        <select name="level" value={form.level} onChange={handleChange} required>
          <option value="">Sélectionner…</option>
          <option value="Débutant">Débutant</option>
          <option value="Avancé">Avancé</option>
          <option value="Expert">Expert</option>
        </select>
      </div>

      <div className="form-group">
        <label>Bio</label>
        <textarea name="bio" value={form.bio} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Photos *</label>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => fileInputRef.current.click()}
          disabled={submitLoading || loadingExisting}
        >
          Ajouter une photo ({keptPhotoUrls.length + photos.length}/5)
        </button>

        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handlePhotosSelected} />

        {(keptPhotoUrls.length > 0 || photoPreviews.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {keptPhotoUrls.map((url, idx) => (
              <div
                key={`kept-${url}-${idx}`}
                style={{
                  position: "relative",
                  width: 72,
                  height: 72,
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid rgba(0,0,0,0.12)"
                }}
              >
                <img
                  src={url}
                  alt={`Photo existante ${idx + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <button
                  type="button"
                  onClick={() => removeKeptPhotoAt(idx)}
                  aria-label="Supprimer la photo"
                  title="Supprimer"
                  disabled={submitLoading || loadingExisting}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background: "rgba(0,0,0,0.65)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {photoPreviews.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  position: "relative",
                  width: 72,
                  height: 72,
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid rgba(0,0,0,0.12)"
                }}
              >
                <img
                  src={p.url}
                  alt={`Nouvelle photo ${idx + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <button
                  type="button"
                  onClick={() => removeNewPhotoAt(idx)}
                  aria-label="Supprimer la photo"
                  title="Supprimer"
                  disabled={submitLoading || loadingExisting}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background: "rgba(0,0,0,0.65)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {photoError ? (
          <div style={{ marginTop: 8, color: "tomato" }}>{photoError}</div>
        ) : (
          <small style={{ display: "block", marginTop: 8, opacity: 0.85 }}>1 photo minimum, 5 maximum.</small>
        )}
      </div>

      {submitError ? <div style={{ marginTop: 10, color: "tomato" }}>{submitError}</div> : null}

      <button className="btn-primary btn-block" type="submit" disabled={loadingExisting || submitLoading || !cityConfirmed}>
        {submitLoading ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
