import { useState, useEffect } from 'react';
import { ID, Query } from 'appwrite';
import { databases, DATABASE_ID, PACKING_ID } from '../lib/appwrite';

export default function PackingList({ tripId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!PACKING_ID) { setLoading(false); return; }
    databases
      .listDocuments(DATABASE_ID, PACKING_ID, [Query.equal('tripId', tripId), Query.limit(200)])
      .then((res) => setItems(res.documents))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripId]);

  if (!PACKING_ID) return null;

  async function handleAdd(e) {
    e.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    setAdding(true);
    try {
      const doc = await databases.createDocument(DATABASE_ID, PACKING_ID, ID.unique(), {
        tripId, item: text, checked: false,
      });
      setItems((prev) => [...prev, doc]);
      setNewItem('');
    } catch {}
    setAdding(false);
  }

  async function handleToggle(item) {
    try {
      await databases.updateDocument(DATABASE_ID, PACKING_ID, item.$id, { checked: !item.checked });
      setItems((prev) => prev.map((it) => it.$id === item.$id ? { ...it, checked: !it.checked } : it));
    } catch {}
  }

  async function handleDelete(item) {
    try {
      await databases.deleteDocument(DATABASE_ID, PACKING_ID, item.$id);
      setItems((prev) => prev.filter((it) => it.$id !== item.$id));
    } catch {}
  }

  const checkedCount = items.filter((it) => it.checked).length;
  const total = items.length;

  if (loading) return <div className="status-msg-sm">Loading packing list...</div>;

  return (
    <div className="detail-section">
      <h2 className="section-title">Packing List{total > 0 && <span className="packing-count">{checkedCount}/{total}</span>}</h2>

      {total > 0 && (
        <div className="packing-progress-bar">
          <div className="packing-progress-fill" style={{ width: `${total > 0 ? (checkedCount / total) * 100 : 0}%` }} />
        </div>
      )}

      {total > 0 && (
        <ul className="packing-list">
          {items.map((item) => (
            <li key={item.$id} className={`packing-item${item.checked ? ' packing-item-checked' : ''}`}>
              <label className="packing-item-label">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleToggle(item)}
                  className="packing-checkbox"
                />
                <span className="packing-item-text">{item.item}</span>
              </label>
              <button className="packing-item-delete" onClick={() => handleDelete(item)} title="Remove item">×</button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="packing-add-row">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item..."
          className="packing-add-input"
          disabled={adding}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={adding || !newItem.trim()}>Add</button>
      </form>
    </div>
  );
}
