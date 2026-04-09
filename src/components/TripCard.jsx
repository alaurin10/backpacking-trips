import { Link } from 'react-router-dom';

const DIFFICULTY_LABELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

function formatDateRange(start, end) {
  if (!start) return null;
  const s = new Date(start + 'T00:00:00');
  if (!end || end === start) {
    return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const e = new Date(end + 'T00:00:00');
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();

  if (sameMonth) {
    // "Apr 15–18, 2025"
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`;
  }
  if (sameYear) {
    // "Apr 15 – May 2, 2025"
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`;
  }
  // "Dec 30, 2025 – Jan 2, 2026"
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function TripCard({ trip }) {
  const nights = trip.nights ?? null;
  const campsites = trip.campsites ?? [];

  const stats = [
    formatDateRange(trip.startDate, trip.endDate),
    nights != null ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : null,
    trip.distanceMiles ? `${trip.distanceMiles} mi` : null,
    trip.elevationFeet ? `${trip.elevationFeet.toLocaleString()} ft gain` : null,
    trip.maxGroupSize ? `max ${trip.maxGroupSize}` : null,
  ].filter(Boolean);

  const hasStats = stats.length > 0;
  const hasCampsites = campsites.length > 0;

  return (
    <Link to={`/trips/${trip.$id}`} className="trip-card">
      <div className="trip-card-top">
        <div className="trip-card-header">
          <h2 className="trip-card-name">{trip.name}</h2>
          {trip.difficulty && (
            <span className={`badge badge-${trip.difficulty}`}>
              {DIFFICULTY_LABELS[trip.difficulty]}
            </span>
          )}
        </div>
        {trip.location && <p className="trip-card-location">{trip.location}</p>}
      </div>

      {(hasStats || hasCampsites) && <div className="trip-card-divider" />}

      {hasStats && (
        <div className="trip-card-stats">
          {stats.map((s, i) => (
            <span key={i} className="trip-card-stat">{s}</span>
          ))}
        </div>
      )}

      {hasCampsites && (
        <div className={`trip-card-campsites${hasStats ? ' trip-card-campsites-bordered' : ''}`}>
          {campsites.map((site, i) => (
            <span key={i} className="campsite-pill">
              <span className="campsite-night">N{i + 1}</span>
              {site}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
