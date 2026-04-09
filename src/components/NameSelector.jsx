import { useState } from 'react';
import { usePeople } from '../hooks/usePeople';

// value: currently selected name string
// onChange: called with the new name string when selection or addition changes
export default function NameSelector({ value, onChange }) {
  const { people, loading, addPerson, removePerson } = usePeople();
  const [mode, setMode] = useState('select'); // 'select' | 'add' | 'manage'
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null); // id being removed
  const [addError, setAddError] = useState(null);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    setAddError(null);
    try {
      const doc = await addPerson(trimmed);
      onChange(doc.name);
      setMode('select');
      setNewName('');
    } catch (err) {
      setAddError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(person) {
    setRemoving(person.$id);
    try {
      await removePerson(person.$id);
      if (value === person.name) onChange('');
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return <span className="name-select-loading">Loading names...</span>;
  }

  if (mode === 'add') {
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
          onClick={() => { setMode('select'); setNewName(''); setAddError(null); }}
        >
          Cancel
        </button>
        {addError && <span className="name-add-error">{addError}</span>}
      </div>
    );
  }

  if (mode === 'manage') {
    return (
      <div className="name-manage">
        {people.length === 0 ? (
          <span className="name-select-loading">No names yet.</span>
        ) : (
          <ul className="name-manage-list">
            {people.map((p) => (
              <li key={p.$id} className="name-manage-item">
                <span className="name-manage-name">{p.name}</span>
                <button
                  className="name-manage-remove"
                  onClick={() => handleRemove(p)}
                  disabled={removing === p.$id}
                  title={`Remove ${p.name}`}
                >
                  {removing === p.$id ? '...' : '×'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="btn btn-secondary" onClick={() => setMode('select')}>
          Done
        </button>
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
      <button className="btn btn-secondary" onClick={() => setMode('add')}>
        + Add name
      </button>
      <button className="btn btn-secondary" onClick={() => setMode('manage')}>
        Manage
      </button>
    </div>
  );
}
