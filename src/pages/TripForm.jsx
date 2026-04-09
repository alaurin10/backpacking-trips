import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { databases, DATABASE_ID, TRIPS_ID } from '../lib/appwrite';
import { ID } from 'appwrite';

const EMPTY_FORM = {
  name: '',
  location: '',
  startDate: '',
  endDate: '',
  nights: '',
  distanceMiles: '',
  elevationFeet: '',
  difficulty: '',
  maxGroupSize: '',
  notes: '',
};

function computeNightsFromDates(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const n = Math.round(
    (new Date(endDate + 'T00:00:00') - new Date(startDate + 'T00:00:00')) / 86400000
  );
  return n > 0 ? n : null;
}

export default function TripForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [campsites, setCampsites] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const nightsValue = form.nights !== '' ? parseInt(form.nights, 10) : 0;
  const nights = nightsValue > 0 ? nightsValue : 0;

  // Resize campsites array when nights changes, preserving existing entries
  useEffect(() => {
    setCampsites((prev) =>
      Array.from({ length: nights }, (_, i) => prev[i] ?? '')
    );
  }, [nights]);

  // Auto-suggest nights from dates if nights field is empty
  useEffect(() => {
    const computed = computeNightsFromDates(form.startDate, form.endDate);
    if (computed !== null && form.nights === '') {
      setForm((prev) => ({ ...prev, nights: String(computed) }));
    }
  }, [form.startDate, form.endDate]);

  useEffect(() => {
    if (!isEdit) return;
    databases.getDocument(DATABASE_ID, TRIPS_ID, id).then((doc) => {
      setForm({
        name: doc.name ?? '',
        location: doc.location ?? '',
        startDate: doc.startDate ?? '',
        endDate: doc.endDate ?? '',
        nights: doc.nights != null ? String(doc.nights) : '',
        distanceMiles: doc.distanceMiles ?? '',
        elevationFeet: doc.elevationFeet ?? '',
        difficulty: doc.difficulty ?? '',
        maxGroupSize: doc.maxGroupSize ?? '',
        notes: doc.notes ?? '',
      });
      setCampsites(doc.campsites ?? []);
    });
  }, [id, isEdit]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleCampsiteChange(index, value) {
    setCampsites((prev) => prev.map((s, i) => (i === index ? value : s)));
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
      nights: form.nights !== '' ? parseInt(form.nights, 10) : null,
      distanceMiles: form.distanceMiles !== '' ? parseFloat(form.distanceMiles) : null,
      elevationFeet: form.elevationFeet !== '' ? parseFloat(form.elevationFeet) : null,
      difficulty: form.difficulty || null,
      maxGroupSize: form.maxGroupSize !== '' ? parseInt(form.maxGroupSize, 10) : null,
      campsites: campsites.filter((s) => s.trim()),
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
            <label htmlFor="nights">Nights</label>
            <input
              id="nights"
              name="nights"
              type="number"
              min="1"
              step="1"
              value={form.nights}
              onChange={handleChange}
              placeholder="e.g. 3"
            />
          </div>
          <div className="form-group">
            <label htmlFor="maxGroupSize">Max Group Size</label>
            <input
              id="maxGroupSize"
              name="maxGroupSize"
              type="number"
              min="1"
              step="1"
              value={form.maxGroupSize}
              onChange={handleChange}
              placeholder="e.g. 4"
            />
          </div>
        </div>

        {nights > 0 && (
          <div className="form-group">
            <label>Campsites by Night</label>
            <div className="campsite-inputs">
              {Array.from({ length: nights }, (_, i) => (
                <div key={i} className="campsite-input-row">
                  <span className="campsite-night-label">Night {i + 1}</span>
                  <input
                    type="text"
                    value={campsites[i] ?? ''}
                    onChange={(e) => handleCampsiteChange(i, e.target.value)}
                    placeholder="e.g. Guitar Lake"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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
