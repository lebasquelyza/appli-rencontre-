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
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);

  // 🔐 référence état initial
  const initialRef = useRef(null);

  /* -------------------------------
     Pré-remplissage
  -------------------------------- */
  useEffect(() => {
    if (!existingProfile) {
      setForm(emptyForm);
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
    setPhotos([]);
    initialRef.current = JSON.stringify(initial);
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
      bio: form.bio
    });

    const dirty = current !== initialRef.current || photos.length > 0;
    onDirtyChange?.(dirty);
  }, [form, photos, onDirtyChange]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handlePhotosSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPhotos((p) => [...p, ...files].slice(0, 5));
    e.target.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    await onSaveProfile({
      ...form,
      age: form.age ? Number(form.age) : null,
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
        <label>Photos</label>
        <button type="button" className="btn-ghost" onClick={() => fileInputRef.current.click()}>
          Ajouter une photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handlePhotosSelected}
        />
      </div>

      <button className="btn-primary btn-block" type="submit">
        Enregistrer
      </button>
    </form>
  );
}
