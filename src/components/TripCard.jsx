import { Link } from 'react-router-dom';

const DIFFICULTY_LABELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TripCard({ trip }) {
  const nights = trip.nights ?? null;
  const campsites = trip.campsites ?? [];

  return (
    <Link to={`/trips/${trip.$id}`} className="trip-card">
      <div className="trip-card-header">
        <h2 className="trip-card-name">{trip.name}</h2>
        {trip.difficulty && (
          <span className={`badge badge-${trip.difficulty}`}>
            {DIFFICULTY_LABELS[trip.difficulty]}
          </span>
        )}
      </div>

      {trip.location && <p className="trip-card-location">{trip.location}</p>}

      <div className="trip-card-meta">
        {trip.startDate && (
          <span>
            {formatDate(trip.startDate)}
            {trip.endDate && ` – ${formatDate(trip.endDate)}`}
          </span>
        )}
        {nights != null && (
          <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
        )}
        {trip.maxGroupSize && (
          <span>max {trip.maxGroupSize}</span>
        )}
        {trip.distanceMiles && <span>{trip.distanceMiles} mi</span>}
        {trip.elevationFeet && <span>{trip.elevationFeet.toLocaleString()} ft gain</span>}
      </div>

      {campsites.length > 0 && (
        <div className="trip-card-campsites">
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
