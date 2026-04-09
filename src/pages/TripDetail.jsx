import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { databases, DATABASE_ID, TRIPS_ID, DOCUMENTS_ID } from '../lib/appwrite';
import { Query } from 'appwrite';
import DocumentUpload from '../components/DocumentUpload';
import TripInterest from '../components/TripInterest';

const DIFFICULTY_LABELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  return 'other';
}

function DocViewer({ doc }) {
  const [open, setOpen] = useState(false);
  const type = getFileType(doc.fileName);

  return (
    <div className="doc-viewer">
      <div className="doc-viewer-header">
        <button className="doc-toggle" onClick={() => setOpen((o) => !o)}>
          <span className="doc-toggle-icon">{open ? '▾' : '▸'}</span>
          <span className="doc-link">{doc.fileName}</span>
        </button>
        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="doc-download">
          Open ↗
        </a>
      </div>
      {open && (
        <div className="doc-preview">
          {type === 'pdf' && (
            <iframe
              src={doc.fileUrl}
              title={doc.fileName}
              className="doc-iframe"
            />
          )}
          {type === 'image' && (
            <img src={doc.fileUrl} alt={doc.fileName} className="doc-img" />
          )}
          {type === 'other' && (
            <p className="doc-no-preview">
              No preview available.{' '}
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="doc-link">
                Download file
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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
        {trip.nights > 0 && (
          <span className="meta-item">{trip.nights} {trip.nights === 1 ? 'night' : 'nights'}</span>
        )}
        {trip.maxGroupSize && (
          <span className="meta-item">max {trip.maxGroupSize}</span>
        )}
        {trip.distanceMiles && (
          <span className="meta-item">{trip.distanceMiles} miles</span>
        )}
        {trip.elevationFeet && (
          <span className="meta-item">{trip.elevationFeet.toLocaleString()} ft gain</span>
        )}
      </div>

      {trip.campsites?.length > 0 && (
        <div className="detail-section">
          <h2 className="section-title">Campsites</h2>
          <ol className="campsite-list">
            {trip.campsites.map((site, i) => (
              <li key={i} className="campsite-list-item">
                <span className="campsite-night-label">Night {i + 1}</span>
                <span>{site}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {trip.notes && (
        <div className="detail-section">
          <h2 className="section-title">Notes</h2>
          <p className="detail-notes">{trip.notes}</p>
        </div>
      )}

      <TripInterest tripId={id} maxGroupSize={trip.maxGroupSize ?? null} />

      <div className="detail-section">
        <h2 className="section-title">Documents</h2>
        {docs.length === 0 ? (
          <p className="status-msg-sm">No documents uploaded yet.</p>
        ) : (
          <div className="doc-list">
            {docs.map((doc) => (
              <DocViewer key={doc.$id} doc={doc} />
            ))}
          </div>
        )}
        <DocumentUpload tripId={id} onUploaded={(doc) => setDocs((prev) => [...prev, doc])} />
      </div>
    </div>
  );
}
