import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { databases, storage, DATABASE_ID, TRIPS_ID, DOCUMENTS_ID, BUCKET_ID } from '../lib/appwrite';
import { Query } from 'appwrite';
import DocumentUpload from '../components/DocumentUpload';
import TripInterest from '../components/TripInterest';
import RouteMap from '../components/RouteMap';

const DIFFICULTY_LABELS = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

function formatDateRange(start, end) {
  if (!start) return null;
  const s = new Date(start + 'T00:00:00');
  if (!end || end === start) {
    return s.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  const e = new Date(end + 'T00:00:00');
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  if (sameMonth) {
    return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`;
  }
  if (sameYear) {
    return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, ${e.getFullYear()}`;
  }
  return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
}

function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  return 'other';
}

function DocViewer({ doc, onDelete }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const type = getFileType(doc.fileName);

  async function handleDelete() {
    if (!confirm(`Delete "${doc.fileName}"?`)) return;
    setDeleting(true);
    await onDelete(doc);
    setDeleting(false);
  }

  return (
    <div className="doc-viewer">
      <div className="doc-viewer-header">
        <button className="doc-toggle" onClick={() => setOpen((o) => !o)}>
          <span className="doc-toggle-icon">{open ? '▾' : '▸'}</span>
          <span className="doc-link">{doc.fileName}</span>
        </button>
        <div className="doc-viewer-actions">
          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="doc-download">
            Open ↗
          </a>
          <button className="doc-delete" onClick={handleDelete} disabled={deleting} title="Delete file">
            {deleting ? '…' : '×'}
          </button>
        </div>
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

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [docs, setDocs] = useState([]);
  const [activeGpxUrl, setActiveGpxUrl] = useState(null);
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
        const firstGpx = docsRes.documents.find((d) => d.fileName.endsWith('.gpx'));
        if (firstGpx) setActiveGpxUrl(firstGpx.fileUrl);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDeleteDoc(doc) {
    try {
      await Promise.all([
        storage.deleteFile(BUCKET_ID, doc.fileId),
        databases.deleteDocument(DATABASE_ID, DOCUMENTS_ID, doc.$id),
      ]);
      setDocs((prev) => prev.filter((d) => d.$id !== doc.$id));
      if (activeGpxUrl === doc.fileUrl) {
        const remaining = docs.filter((d) => d.$id !== doc.$id && d.fileName.endsWith('.gpx'));
        setActiveGpxUrl(remaining[0]?.fileUrl ?? null);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${trip.name}"? This cannot be undone.`)) return;
    await databases.deleteDocument(DATABASE_ID, TRIPS_ID, id);
    navigate('/');
  }

  if (loading) return <div className="status-msg">Loading...</div>;
  if (error) return <div className="status-msg error">Error: {error}</div>;
  if (!trip) return <div className="status-msg">Trip not found.</div>;

  const stats = [
    trip.startDate && { label: 'Dates', value: formatDateRange(trip.startDate, trip.endDate) },
    trip.nights > 0 && { label: 'Duration', value: `${trip.nights} ${trip.nights === 1 ? 'night' : 'nights'}` },
    trip.distanceMiles && { label: 'Distance', value: `${trip.distanceMiles} mi` },
    trip.elevationFeet && { label: 'Elev. Gain', value: `${trip.elevationFeet.toLocaleString()} ft` },
    trip.maxGroupSize && { label: 'Group Size', value: `Max ${trip.maxGroupSize}` },
  ].filter(Boolean);

  return (
    <div className="detail-page">
      <div className="detail-header">
        <div className="detail-header-title">
          <div className="detail-title-row">
            <h1 className="page-title">{trip.name}</h1>
            {trip.difficulty && (
              <span className={`badge badge-${trip.difficulty}`}>
                {DIFFICULTY_LABELS[trip.difficulty]}
              </span>
            )}
          </div>
          {trip.location && <p className="detail-location">{trip.location}</p>}
        </div>
        <div className="detail-actions">
          <Link to={`/trips/${id}/edit`} className="btn btn-secondary">Edit</Link>
          <button onClick={handleDelete} className="btn btn-danger">Delete</button>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="detail-stats">
          {stats.map(({ label, value }) => (
            <div key={label} className="detail-stat">
              <span className="detail-stat-label">{label}</span>
              <span className="detail-stat-value">{value}</span>
            </div>
          ))}
        </div>
      )}

      {trip.campsites?.length > 0 && (
        <div className="detail-section">
          <h2 className="section-title">Itinerary</h2>
          <ol className="campsite-list">
            {trip.campsites.map((site, i) => (
              <li key={i} className="campsite-list-item">
                <span className="campsite-night-label">Night {i + 1}</span>
                <span className="campsite-list-name">{site}</span>
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

      <TripInterest tripId={id} maxGroupSize={trip.maxGroupSize ?? null} startDate={trip.startDate} endDate={trip.endDate} />

      {(() => {
        const gpxDocs = docs.filter((d) => d.fileName.endsWith('.gpx'));
        return (
          <div className="detail-section">
            <h2 className="section-title">Route</h2>
            {activeGpxUrl && (() => {
              const activeDoc = gpxDocs.find((d) => d.fileUrl === activeGpxUrl);
              return (
                <div className="route-gpx-bar">
                  {gpxDocs.length > 1 ? (
                    <select
                      className="route-gpx-select"
                      value={activeGpxUrl}
                      onChange={(e) => setActiveGpxUrl(e.target.value)}
                    >
                      {gpxDocs.map((d) => (
                        <option key={d.$id} value={d.fileUrl}>{d.fileName}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="route-gpx-name">{activeDoc?.fileName}</span>
                  )}
                  {activeDoc && (
                    <button
                      className="doc-delete"
                      title="Remove GPX file"
                      onClick={async () => {
                        if (!confirm(`Delete "${activeDoc.fileName}"?`)) return;
                        await handleDeleteDoc(activeDoc);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })()}
            {activeGpxUrl ? (
              <RouteMap gpxUrl={activeGpxUrl} />
            ) : (
              <div className="route-map-placeholder">
                <span>No route uploaded yet.</span>
                <span>Upload a .gpx file below to display the route on a map.</span>
              </div>
            )}
            <div className="route-upload">
              <DocumentUpload
                tripId={id}
                accept=".gpx"
                label="+ Upload GPX"
                onUploaded={(doc) => {
                  setDocs((prev) => [...prev, doc]);
                  setActiveGpxUrl(doc.fileUrl);
                }}
              />
            </div>
          </div>
        );
      })()}

      <div className="detail-section">
        <h2 className="section-title">Documents</h2>
        {docs.filter((d) => !d.fileName.endsWith('.gpx')).length === 0 ? (
          <p className="status-msg-sm">No documents uploaded yet.</p>
        ) : (
          <div className="doc-list">
            {docs.filter((d) => !d.fileName.endsWith('.gpx')).map((doc) => (
              <DocViewer key={doc.$id} doc={doc} onDelete={handleDeleteDoc} />
            ))}
          </div>
        )}
        <DocumentUpload tripId={id} onUploaded={(doc) => setDocs((prev) => [...prev, doc])} />
      </div>
    </div>
  );
}
