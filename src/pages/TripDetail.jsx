import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { databases, storage, DATABASE_ID, TRIPS_ID, DOCUMENTS_ID, BUCKET_ID } from '../lib/appwrite';
import { Query } from 'appwrite';
import DocumentUpload from '../components/DocumentUpload';
import TripInterest from '../components/TripInterest';
import RouteMap from '../components/RouteMap';
import ConfirmDialog from '../components/ConfirmDialog';
import PackingList from '../components/PackingList';
import TripComments from '../components/TripComments';
import { SkeletonDetail } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const type = getFileType(doc.fileName);

  async function handleDelete() {
    setConfirmOpen(false);
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
          <button className="doc-delete" onClick={() => setConfirmOpen(true)} disabled={deleting} title="Delete file">
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
      <ConfirmDialog
        open={confirmOpen}
        title="Delete file"
        message={`Delete "${doc.fileName}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [trip, setTrip] = useState(null);
  const [docs, setDocs] = useState([]);
  const [activeGpxUrl, setActiveGpxUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmGpx, setConfirmGpx] = useState(null);

  useDocumentTitle(trip?.name || 'Trip');

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
      showToast('File deleted');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    setConfirmDelete(false);
    await databases.deleteDocument(DATABASE_ID, TRIPS_ID, id);
    showToast('Trip deleted');
    navigate('/');
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(
      () => showToast('Link copied!'),
      () => showToast('Failed to copy link', 'error')
    );
  }

  if (loading) return <SkeletonDetail />;
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
          <button onClick={handleShare} className="btn btn-secondary btn-sm">Share</button>
          <Link to={`/trips/${id}/edit`} className="btn btn-secondary">Edit</Link>
          <button onClick={() => setConfirmDelete(true)} className="btn btn-danger">Delete</button>
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

      {trip.permitLink && (
        <div className="detail-section">
          <h2 className="section-title">Permit / Ticket</h2>
          <a href={trip.permitLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            Book Permit / Ticket ↗
          </a>
        </div>
      )}

      {trip.notes && (
        <div className="detail-section">
          <h2 className="section-title">Notes</h2>
          <p className="detail-notes">{trip.notes}</p>
        </div>
      )}

      <TripInterest tripId={id} maxGroupSize={trip.maxGroupSize ?? null} hasDate={Boolean(trip.startDate)} />

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
                      onClick={() => setConfirmGpx(activeDoc)}
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
                <svg className="empty-state-icon-sm" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 3C11.58 3 8 6.58 8 11c0 6 8 18 8 18s8-12 8-18c0-4.42-3.58-8-8-8z" fill="var(--green-light)" stroke="var(--green)" strokeWidth="1.5"/>
                  <circle cx="16" cy="11" r="3" fill="var(--green)"/>
                </svg>
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
          <div className="empty-state-inline">
            <svg className="empty-state-icon-sm" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="3" width="20" height="26" rx="2" fill="var(--green-light)" stroke="var(--green)" strokeWidth="1.5"/>
              <path d="M11 10h10M11 15h10M11 20h6" stroke="var(--green)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span>No documents uploaded yet.</span>
          </div>
        ) : (
          <div className="doc-list">
            {docs.filter((d) => !d.fileName.endsWith('.gpx')).map((doc) => (
              <DocViewer key={doc.$id} doc={doc} onDelete={handleDeleteDoc} />
            ))}
          </div>
        )}
        <DocumentUpload tripId={id} onUploaded={(doc) => { setDocs((prev) => [...prev, doc]); showToast('File uploaded'); }} />
      </div>

      <PackingList tripId={id} />

      <TripComments tripId={id} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete trip"
        message={`Delete "${trip.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={Boolean(confirmGpx)}
        title="Delete GPX file"
        message={confirmGpx ? `Delete "${confirmGpx.fileName}"?` : ''}
        confirmLabel="Delete"
        onConfirm={async () => { const doc = confirmGpx; setConfirmGpx(null); await handleDeleteDoc(doc); }}
        onCancel={() => setConfirmGpx(null)}
      />
    </div>
  );
}
