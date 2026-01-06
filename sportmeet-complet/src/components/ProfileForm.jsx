// sportmeet-complet/src/components/ProfileForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

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

// Helpers: accepte ["url1"] OU [{id,url}, ...]
function photoToUrl(p) {
  if (!p) return "";
  if (typeof p === "string") return p;
  return p.url || p.src || "";
}
function photoToKey(p) {
  if (!p) return "";
  if (typeof p === "string") return p; // url comme clé
  return p.id || p._id || p.url || p.src || JSON.stringify(p);
}

export function ProfileForm({
  existingProfile,
  loadingExisting,
  onSaveProfile,
  onDirtyChange
}) {
  const isEdit = !!existingProfile?.id;

  const [form, setForm] = useState(emptyForm);

  // ✅ on garde ta logique: `photos` = seulement les nouvelles photos (File)
  const [photos, setPhotos] = useState([]);

  // ✅ AJOUT: gestion photos existantes + suppressions
  const [existingPhotos, setExistingPhotos] = useState([]); // string|object
  const [removedExistingKeys, setRemovedExistingKeys] = useState([]); // key (id/url)
  const [photoError, setPhotoError] = useState("");

  const fileInputRef = useRef(null);

  // 🔐 référence état initial (inchangée)
  const initialRef = useRef(null);

  /* -------------------------------
     Pré-remplissage (inchangé sur le form)
  -------------------------------- */
  useEffect(() => {
    if (!existingProfile) {
      setForm(emptyForm);
      setPhotos([]);

      // ✅ AJOUT: photos existantes reset
      setExistingPhotos([]);
      setRemovedExistingKeys([]);
      setPhotoError("");

      initialRef.current = JSON.stringify(emptyForm);
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

    // ✅ comme avant: on remet à zéro les nouvelles photos
    setPhotos([]);

    // ✅ AJOUT: on charge les photos existantes (si dispo)
    setExistingPhotos(Array.isArray(existingProfile.photos) ? existingProfile.photos : []);
    setRemovedExistingKeys([]);
    setPhotoError("");

    initialRef.current = JSON.stringify(initial);
  }, [existingProfile?.id]);

  const keptExistingPhotos = useMemo(() => {
    const removed = new Set(removedExistingKeys);
    return existingPhotos.filter((p) => !removed.has(photoToKey(p)));
  }, [existingPhotos, removedExistingKeys]);

  const totalPhotosCount = keptExistingPhotos.length + photos.length;
  const canAddMore = totalPhotosCount < 5;

  /* -------------------------------
     Dirty detection (logique conservée + suppression existantes)
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
      bio: form.bio
    });

    // ✅ on garde ton idée: dirty si form diff OU nouvelles photos
    // ✅ + on ajoute: suppression d'une photo existante
    const dirty =
      current !== initialRef.current ||
      photos.length > 0 ||
      removedExistingKeys.length > 0;

    onDirtyChange?.(dirty);
  }, [form, photos, removedExistingKeys, onDirtyChange]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handlePhotosSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 5 - totalPhotosCount;
    const toAdd = files.slice(0, Math.max(0, remainingSlots));

    if (toAdd.length < files.length) {
      setPhotoError("Maximum 5 photos : certaines images n'ont pas été ajoutées.");
    } else {
      setPhotoError("");
    }

    setPhotos((p) => [...p, ...toAdd]); // ✅ conserve ton state `photos`
    e.target.value = "";
  };

  const removeExistingPhoto = (p) => {
    if (totalPhotosCount <= 1) {
      setPhotoError("Tu dois garder au moins 1 photo.");
      return;
    }
    const key = photoToKey(p);
    setRemovedExistingKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const removeNewPhotoAt = (index) => {
    if (totalPhotosCount <= 1) {
      setPhotoError("Tu dois garder au moins 1 photo.");
      return;
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();

    // ✅ min 1 / max 5
    if (totalPhotosCount < 1) {
      setPhotoError("Ajoute au moins 1 photo pour enregistrer.");
      return;
    }
    if (totalPhotosCount > 5) {
      setPhotoError("Maximum 5 photos.");
      return;
    }

    await onSaveProfile({
      ...form,
      age: form.age ? Number(form.age) : null,

      // ✅ garde ton champ `photos` pour les nouveaux fichiers
      photos,

      // ✅ AJOUT: le serveur saura quoi supprimer
      photosToRemove: removedExistingKeys,

      // ✅ optionnel: si ton backend remplace toute la liste
      keptExistingPhotos
    });

    onDirtyChange?.(false);
    setPhotos([]);
    setRemovedExistingKeys([]);
    setPhotoError("");
  };

  // previews des nouvelles photos
  const newPreviews = useMemo(() => {
    return photos.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
  }, [photos]);

  useEffect(() => {
    return () => {
      newPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [newPreviews]);

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-group">
        <label>Prénom *</label>
        <input name="name" value={form.name} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Ville *</label>
        <input name="city" value={form.city} onChange={handleChange} />
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
        <label>Photos (min 1, max 5)</label>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <button
            type="button"
            className="btn-ghost"
            disabled={!canAddMore}
            onClick={() => fileInputRef.current?.click()}
            title={!canAddMore ? "Maximum 5 photos" : ""}
          >
            Ajouter une photo
          </button>

          <div style={{ fontSize: 12, opacity: 0.8 }}>{totalPhotosCount}/5</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={!canAddMore}
          onChange={handlePhotosSelected}
        />

        {(keptExistingPhotos.length > 0 || newPreviews.length > 0) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: 10
            }}
          >
            {keptExistingPhotos.map((p) => {
              const url = photoToUrl(p);
              const key = photoToKey(p);
              return (
                <div key={key} style={{ position: "relative" }}>
                  <img
                    src={url}
                    alt="Photo"
                    style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 10 }}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => removeExistingPhoto(p)}
                    disabled={totalPhotosCount <= 1}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      padding: "4px 8px",
                      background: "rgba(0,0,0,0.55)",
                      color: "white",
                      borderRadius: 8
                    }}
                    title={totalPhotosCount <= 1 ? "Minimum 1 photo" : "Supprimer"}
                  >
                    🗑
                  </button>
                </div>
              );
            })}

            {newPreviews.map((p, idx) => (
              <div key={`${p.name}-${idx}`} style={{ position: "relative" }}>
                <img
                  src={p.url}
                  alt="Nouvelle photo"
                  style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 10 }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => removeNewPhotoAt(idx)}
                  disabled={totalPhotosCount <= 1}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    padding: "4px 8px",
                    background: "rgba(0,0,0,0.55)",
                    color: "white",
                    borderRadius: 8
                  }}
                  title={totalPhotosCount <= 1 ? "Minimum 1 photo" : "Supprimer"}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}

        {photoError && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#b00020" }}>
            {photoError}
          </div>
        )}
      </div>

      <button className="btn-primary btn-block" type="submit" disabled={totalPhotosCount < 1}>
        Enregistrer
      </button>
    </form>
  );
}
