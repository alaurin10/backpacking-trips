import { useState } from 'react';
import { usePeople } from '../hooks/usePeople';

// value: currently selected name string
// onChange: called with the new name string when selection or addition changes
export default function NameSelector({ value, onChange }) {
  const { people, loading, addPerson } = usePeople();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState(null);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    setAddError(null);
    try {
      const doc = await addPerson(trimmed);
      onChange(doc.name);
      setAdding(false);
      setNewName('');
    } catch (err) {
      setAddError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <span className="name-select-loading">Loading names...</span>;
  }

  if (adding) {
    return (
      <div className="name-add-row">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Your name"
          className="name-input"
          autoFocus
        />
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={saving || !newName.trim()}
        >
          {saving ? '...' : 'Add'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => { setAdding(false); setNewName(''); setAddError(null); }}
        >
          Cancel
        </button>
        {addError && <span className="name-add-error">{addError}</span>}
      </div>
    );
  }

  return (
    <div className="name-selector-row">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="name-select"
      >
        <option value="">— Select your name —</option>
        {people.map((p) => (
          <option key={p.$id} value={p.name}>{p.name}</option>
        ))}
      </select>
      <button className="btn btn-secondary" onClick={() => setAdding(true)}>
        + Add name
      </button>
    </div>
  );
}
