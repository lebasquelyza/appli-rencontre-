//sportmeet-complet/src/components/ProfileForm.jsx
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

export function ProfileForm({
  existingProfile,
  loadingExisting,
  onSaveProfile,
  onDirtyChange
}) {
  const isEdit = !!existingProfile?.id;

  const [form, setForm] = useState(emptyForm);

  // ✅ Photos: 1 obligatoire, max 5
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");

  // ✅ Age: blocage si < 16
  const [ageError, setAgeError] = useState("");

  // ✅ Position exacte
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [geoStatus, setGeoStatus] = useState("");

  const fileInputRef = useRef(null);

  // 🔐 référence état initial
  const initialRef = useRef(null);

  /* -------------------------------
     Pré-remplissage
  -------------------------------- */
  useEffect(() => {
    if (!existingProfile) {
      setForm(emptyForm);
      setPhotos([]);
      setCoords({ lat: null, lng: null });
      initialRef.current = JSON.stringify({
        ...emptyForm,
        latitude: null,
        longitude: null
      });
      return;
    }

    const initial = {
      name: existingProfile.name || "",
      age: existingProfile.age ?? "",
      city: existingProfile.city || "",
      sport: existingProfile.sport || "",
      level: existingProfile.level || "",
      availability: existingProfile.availability || "",
      bio: existingProfile.bio || ""
    };

    setForm(initial);
    setPhotos([]);

    // ✅ si ton backend a déjà lat/lng, on les récupère, sinon null
    setCoords({
      lat: existingProfile.latitude ?? null,
      lng: existingProfile.longitude ?? null
    });

    initialRef.current = JSON.stringify({
      ...initial,
      latitude: existingProfile.latitude ?? null,
      longitude: existingProfile.longitude ?? null
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
      city: form.city,
      sport: form.sport,
      level: form.level,
      availability: form.availability,
      bio: form.bio,
      latitude: coords.lat,
      longitude: coords.lng
    });

    const dirty = current !== initialRef.current || photos.length > 0;
    onDirtyChange?.(dirty);
  }, [form, photos, coords, onDirtyChange]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "age") setAgeError("");
    setForm((p) => ({ ...p, [name]: value }));
  };

  // ✅ bouton 📍 : récupère position exacte
  const detectLocation = () => {
    setGeoStatus("");

    if (!navigator.geolocation) {
      setGeoStatus("Géolocalisation non supportée.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setGeoStatus(`Position détectée ✅ (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      },
      (err) => {
        if (err.code === 1) setGeoStatus("Autorisation refusée.");
        else setGeoStatus("Impossible de récupérer la position.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ✅ Photos: max 5, et 1 obligatoire (contrôle à l’ajout + contrôle au submit)
  const handlePhotosSelected = (e) => {
    setPhotoError("");

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setPhotos((p) => {
      const next = [...p, ...files].slice(0, 5);
      return next;
    });

    e.target.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();

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

    // ✅ 1 photo obligatoire
    if (!photos || photos.length < 1) {
      setPhotoError("Au moins 1 photo est obligatoire.");
      return;
    }

    // ✅ max 5 sécurité
    if (photos.length > 5) {
      setPhotoError("Maximum 5 photos.");
      return;
    }

    await onSaveProfile({
      ...form,
      age: form.age ? Number(form.age) : null,

      // ✅ position exacte
      latitude: coords.lat,
      longitude: coords.lng,

      photos
    });

    onDirtyChange?.(false);
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-group">
        <label>Prénom *</label>
        <input name="name" value={form.name} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Âge *</label>
        <input
          name="age"
          type="number"
          min="0"
          inputMode="numeric"
          value={form.age}
          onChange={handleChange}
        />
        {ageError && <div style={{ marginTop: 8, color: "tomato" }}>{ageError}</div>}
      </div>

      <div className="form-group">
        <label>Ville *</label>

        {/* ✅ Ville + icône 📍 à droite */}
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

        {(geoStatus || (coords.lat != null && coords.lng != null)) && (
          <small style={{ display: "block", marginTop: 6, opacity: 0.85 }}>
            {geoStatus ||
              `Position enregistrée ✅ (${Number(coords.lat).toFixed(5)}, ${Number(coords.lng).toFixed(5)})`}
          </small>
        )}
      </div>

      <div className="form-group">
        <label>Sport *</label>
        <input name="sport" value={form.sport} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Niveau *</label>
        <input name="level" value={form.level} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Bio</label>
        <textarea name="bio" value={form.bio} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Photos *</label>
        <button type="button" className="btn-ghost" onClick={() => fileInputRef.current.click()}>
          Ajouter une photo ({photos.length}/5)
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handlePhotosSelected}
        />

        {/* ✅ message obligatoire / erreurs */}
        {photoError ? (
          <div style={{ marginTop: 8, color: "tomato" }}>{photoError}</div>
        ) : (
          <small style={{ display: "block", marginTop: 8, opacity: 0.85 }}>
            1 photo minimum, 5 maximum.
          </small>
        )}
      </div>

      <button className="btn-primary btn-block" type="submit" disabled={loadingExisting}>
        Enregistrer
      </button>
    </form>
  );
}
