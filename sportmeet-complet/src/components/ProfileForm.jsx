//sportmeet-complet/src/components/ProfileForm.jsx
import React, { useEffect, useRef, useState } from "react";

const emptyForm = {
  name: "",
  age: "",
  gender: "",
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

  // ✅ Photos: nouvelles (File) upload
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState("");

  // ✅ Photos existantes conservées (URLs)
  const [keptPhotoUrls, setKeptPhotoUrls] = useState([]);

  // ✅ previews (object urls) pour nouvelles photos
  const [photoPreviews, setPhotoPreviews] = useState([]);

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
    // cleanup previews avant reset
    setPhotoPreviews((prev) => {
      prev.forEach((p) => {
        try {
          URL.revokeObjectURL(p.url);
        } catch {}
      });
      return [];
    });

    if (!existingProfile) {
      setForm(emptyForm);
      setPhotos([]);
      setKeptPhotoUrls([]);
      setCoords({ lat: null, lng: null });

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
    setCoords({
      lat: existingProfile.latitude ?? null,
      lng: existingProfile.longitude ?? null
    });

    initialRef.current = JSON.stringify({
      ...initial,
      latitude: existingProfile.latitude ?? null,
      longitude: existingProfile.longitude ?? null,
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
          .toString(16)
          .slice(2)}`,
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

    await onSaveProfile({
      ...form,
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,

      // ✅ position exacte
      latitude: coords.lat,
      longitude: coords.lng,

      // ✅ important pour l’édition
      keptPhotoUrls: keptPhotoUrls,

      // ✅ nouvelles photos à uploader
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
          Ajouter une photo ({keptPhotoUrls.length + photos.length}/5)
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handlePhotosSelected}
        />

        {/* ✅ Aperçus: existantes + nouvelles */}
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
