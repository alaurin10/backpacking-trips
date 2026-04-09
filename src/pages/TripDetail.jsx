import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { databases, DATABASE_ID, TRIPS_ID, DOCUMENTS_ID } from '../lib/appwrite';
import { Query } from 'appwrite';
import DocumentUpload from '../components/DocumentUpload';

const DIFFICULTY_LABELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      databases.getDocument(DATABASE_ID, TRIPS_ID, id),
      databases.listDocuments(DATABASE_ID, DOCUMENTS_ID, [Query.equal('tripId', id)]),
    ])
      .then(([tripDoc, docsRes]) => {
        setTrip(tripDoc);
        setDocs(docsRes.documents);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm(`Delete "${trip.name}"? This cannot be undone.`)) return;
    await databases.deleteDocument(DATABASE_ID, TRIPS_ID, id);
    navigate('/');
  }

  if (loading) return <div className="status-msg">Loading...</div>;
  if (error) return <div className="status-msg error">Error: {error}</div>;
  if (!trip) return <div className="status-msg">Trip not found.</div>;

  return (
    <div className="detail-page">
      <div className="detail-header">
        <div>
          <h1 className="page-title">{trip.name}</h1>
          {trip.location && <p className="detail-location">{trip.location}</p>}
        </div>
        <div className="detail-actions">
          <Link to={`/trips/${id}/edit`} className="btn btn-secondary">Edit</Link>
          <button onClick={handleDelete} className="btn btn-danger">Delete</button>
        </div>
      </div>

      <div className="detail-meta">
        {trip.difficulty && (
          <span className={`badge badge-${trip.difficulty}`}>
            {DIFFICULTY_LABELS[trip.difficulty]}
          </span>
        )}
        {trip.startDate && (
          <span className="meta-item">
            {formatDate(trip.startDate)}
            {trip.endDate && ` – ${formatDate(trip.endDate)}`}
          </span>
        )}
        {trip.distanceMiles && (
          <span className="meta-item">{trip.distanceMiles} miles</span>
        )}
        {trip.elevationFeet && (
          <span className="meta-item">{trip.elevationFeet.toLocaleString()} ft gain</span>
        )}
      </div>

      {trip.notes && (
        <div className="detail-section">
          <h2 className="section-title">Notes</h2>
          <p className="detail-notes">{trip.notes}</p>
        </div>
      )}

      <div className="detail-section">
        <h2 className="section-title">Documents</h2>
        {docs.length === 0 ? (
          <p className="status-msg-sm">No documents uploaded yet.</p>
        ) : (
          <ul className="doc-list">
            {docs.map((doc) => (
              <li key={doc.$id} className="doc-item">
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="doc-link">
                  {doc.fileName}
                </a>
              </li>
            ))}
          </ul>
        )}
        <DocumentUpload tripId={id} onUploaded={(doc) => setDocs((prev) => [...prev, doc])} />
      </div>
    </div>
  );
}
