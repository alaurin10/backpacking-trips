import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { databases, DATABASE_ID, TRIPS_ID } from '../lib/appwrite';
import { ID } from 'appwrite';

const EMPTY_FORM = {
  name: '',
  location: '',
  startDate: '',
  endDate: '',
  distanceMiles: '',
  elevationFeet: '',
  difficulty: '',
  notes: '',
};

export default function TripForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    databases.getDocument(DATABASE_ID, TRIPS_ID, id).then((doc) => {
      setForm({
        name: doc.name ?? '',
        location: doc.location ?? '',
        startDate: doc.startDate ?? '',
        endDate: doc.endDate ?? '',
        distanceMiles: doc.distanceMiles ?? '',
        elevationFeet: doc.elevationFeet ?? '',
        difficulty: doc.difficulty ?? '',
        notes: doc.notes ?? '',
      });
    });
  }, [id, isEdit]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const data = {
      name: form.name.trim(),
      location: form.location.trim() || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      distanceMiles: form.distanceMiles !== '' ? parseFloat(form.distanceMiles) : null,
      elevationFeet: form.elevationFeet !== '' ? parseFloat(form.elevationFeet) : null,
      difficulty: form.difficulty || null,
      notes: form.notes.trim() || null,
    };

    try {
      let doc;
      if (isEdit) {
        doc = await databases.updateDocument(DATABASE_ID, TRIPS_ID, id, data);
      } else {
        doc = await databases.createDocument(DATABASE_ID, TRIPS_ID, ID.unique(), data);
      }
      navigate(`/trips/${doc.$id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <h1 className="page-title">{isEdit ? 'Edit Trip' : 'New Trip'}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit} className="trip-form">
        <div className="form-group">
          <label htmlFor="name">Trip Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. John Muir Trail Section"
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location / Trail Name</label>
          <input
            id="location"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. Sequoia National Park, CA"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="distanceMiles">Distance (miles)</label>
            <input
              id="distanceMiles"
              name="distanceMiles"
              type="number"
              min="0"
              step="0.1"
              value={form.distanceMiles}
              onChange={handleChange}
              placeholder="e.g. 45.5"
            />
          </div>
          <div className="form-group">
            <label htmlFor="elevationFeet">Elevation Gain (ft)</label>
            <input
              id="elevationFeet"
              name="elevationFeet"
              type="number"
              min="0"
              step="1"
              value={form.elevationFeet}
              onChange={handleChange}
              placeholder="e.g. 8200"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" name="difficulty" value={form.difficulty} onChange={handleChange}>
            <option value="">Select difficulty</option>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={5}
            value={form.notes}
            onChange={handleChange}
            placeholder="Permits needed, gear notes, links..."
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Trip'}
          </button>
        </div>
      </form>
    </div>
  );
}
