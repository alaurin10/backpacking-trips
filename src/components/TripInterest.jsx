import { useState, useEffect } from 'react';
import { ID, Query } from 'appwrite';
import { databases, DATABASE_ID, AVAILABILITY_ID, TRIP_INTEREST_ID } from '../lib/appwrite';
import NameSelector from './NameSelector';

function formatWeekendRange(satIso) {
  const sat = new Date(satIso + 'T00:00:00');
  const sun = new Date(sat);
  sun.setDate(sun.getDate() + 1);
  const fri = new Date(sat);
  fri.setDate(fri.getDate() - 1);
  if (fri.getMonth() === 6 && fri.getDate() === 3) {
    return `${fri.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${sun.getDate()}, ${sat.getFullYear()}`;
  }
  return `${sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${sun.getDate()}, ${sat.getFullYear()}`;
}

function isUpcoming(satIso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(satIso + 'T00:00:00') >= today;
}

export default function TripInterest({ tripId, maxGroupSize }) {
  const [personName, setPersonName] = useState(() => localStorage.getItem('bp_name') || '');
  const [signups, setSignups] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [suggestionPage, setSuggestionPage] = useState(0);

  useEffect(() => {
    if (!TRIP_INTEREST_ID) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [signupsRes, availRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, TRIP_INTEREST_ID, [
            Query.equal('tripId', tripId),
            Query.limit(100),
          ]),
          databases.listDocuments(DATABASE_ID, AVAILABILITY_ID, [Query.limit(500)]),
        ]);
        if (!cancelled) {
          setSignups(signupsRes.documents);
          setAvailability(availRes.documents);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tripId]);

  function handleNameChange(name) {
    setPersonName(name);
    localStorage.setItem('bp_name', name);
  }

  const trimmedName = personName.trim();
  const signedUpNames = signups.map((s) => s.personName);
  const isSignedUp = Boolean(trimmedName && signedUpNames.includes(trimmedName));
  const myRecord = signups.find((s) => s.personName === trimmedName);

  async function handleToggle() {
    if (!trimmedName) {
      alert('Enter your name first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!isSignedUp) {
        const doc = await databases.createDocument(
          DATABASE_ID,
          TRIP_INTEREST_ID,
          ID.unique(),
          { tripId, personName: trimmedName }
        );
        setSignups((prev) => [...prev, doc]);
      } else if (myRecord) {
        await databases.deleteDocument(DATABASE_ID, TRIP_INTEREST_ID, myRecord.$id);
        setSignups((prev) => prev.filter((s) => s.$id !== myRecord.$id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Rank upcoming weekends by how many signed-up people are free that weekend
  function getDateSuggestions() {
    if (signedUpNames.length === 0) return [];
    const weekendMap = {};
    for (const row of availability) {
      if (!isUpcoming(row.weekendStart)) continue;
      if (signedUpNames.includes(row.personName)) {
        if (!weekendMap[row.weekendStart]) weekendMap[row.weekendStart] = [];
        weekendMap[row.weekendStart].push(row.personName);
      }
    }
    return Object.entries(weekendMap)
      .map(([weekend, names]) => ({ weekend, names, count: names.length }))
      .sort((a, b) => b.count - a.count || a.weekend.localeCompare(b.weekend));
  }

  const suggestions = getDateSuggestions();
  const total = signedUpNames.length;
  const overCapacity = maxGroupSize != null && total > maxGroupSize;
  const atCapacity = maxGroupSize != null && total >= maxGroupSize && !isSignedUp;

  const PAGE_SIZE = 5;
  const totalPages = Math.ceil(suggestions.length / PAGE_SIZE);
  const pagedSuggestions = suggestions.slice(suggestionPage * PAGE_SIZE, (suggestionPage + 1) * PAGE_SIZE);

  if (loading) return <div className="status-msg-sm">Loading interest...</div>;

  return (
    <div className="detail-section">
      <h2 className="section-title">
        Interested{total > 0 && <span className="interest-count">{total}</span>}
        {maxGroupSize != null && <span className="interest-capacity"> / {maxGroupSize} max</span>}
      </h2>

      {overCapacity && (
        <div className="alert alert-error">
          Group is over capacity — {total} interested, max {maxGroupSize}.
        </div>
      )}

      <div className="interest-name-bar">
        <label>Your name:</label>
        <NameSelector value={personName} onChange={handleNameChange} />
        <button
          className={`btn ${isSignedUp ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleToggle}
          disabled={saving || atCapacity}
          title={atCapacity ? `Trip is full (max ${maxGroupSize})` : undefined}
        >
          {saving ? '...' : isSignedUp ? 'Remove me' : "I'm interested"}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {total > 0 && (
        <div className="interest-chips">
          {signedUpNames.map((name) => (
            <span
              key={name}
              className={`interest-chip${name === trimmedName ? ' interest-chip-you' : ''}`}
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="interest-suggestions">
          <h3 className="interest-suggestions-title">
            Date Suggestions
            <span className="interest-suggestions-sub">
              based on availability of {total} interested {total === 1 ? 'person' : 'people'}
            </span>
          </h3>
          {suggestions.length === 0 ? (
            <p className="status-msg-sm">
              No upcoming weekends with shared availability yet.
            </p>
          ) : (
            <div className="best-list">
              {pagedSuggestions.map(({ weekend, names, count }, i) => {
                const globalIndex = suggestionPage * PAGE_SIZE + i;
                return (
                  <div
                    key={weekend}
                    className={`best-item${globalIndex < 3 ? ` rank-${globalIndex + 1}` : ''}`}
                  >
                    <span className="best-rank">#{globalIndex + 1}</span>
                    <span className="best-date">{formatWeekendRange(weekend)}</span>
                    <span className="best-count">{count}/{total} free</span>
                    <span className="best-names">{names.join(', ')}</span>
                  </div>
                );
              })}
              {totalPages > 1 && (
                <div className="suggestions-pagination">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSuggestionPage((p) => p - 1)}
                    disabled={suggestionPage === 0}
                  >
                    ← Prev
                  </button>
                  <span className="suggestions-page-label">
                    {suggestionPage + 1} / {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSuggestionPage((p) => p + 1)}
                    disabled={suggestionPage >= totalPages - 1}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
