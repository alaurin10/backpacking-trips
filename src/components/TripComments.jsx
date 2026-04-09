import { useState, useEffect } from 'react';
import { ID, Query } from 'appwrite';
import { databases, DATABASE_ID, COMMENTS_ID } from '../lib/appwrite';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TripComments({ tripId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const currentName = localStorage.getItem('bp_name') || '';

  useEffect(() => {
    if (!COMMENTS_ID) { setLoading(false); return; }
    databases
      .listDocuments(DATABASE_ID, COMMENTS_ID, [
        Query.equal('tripId', tripId),
        Query.orderAsc('createdAt'),
        Query.limit(200),
      ])
      .then((res) => setComments(res.documents))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripId]);

  if (!COMMENTS_ID) return null;

  async function handlePost(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !currentName) return;
    setPosting(true);
    try {
      const doc = await databases.createDocument(DATABASE_ID, COMMENTS_ID, ID.unique(), {
        tripId,
        personName: currentName,
        text: trimmed,
        createdAt: new Date().toISOString(),
      });
      setComments((prev) => [...prev, doc]);
      setText('');
    } catch {}
    setPosting(false);
  }

  async function handleDelete(comment) {
    try {
      await databases.deleteDocument(DATABASE_ID, COMMENTS_ID, comment.$id);
      setComments((prev) => prev.filter((c) => c.$id !== comment.$id));
    } catch {}
  }

  if (loading) return <div className="status-msg-sm">Loading comments...</div>;

  return (
    <div className="detail-section">
      <h2 className="section-title">
        Comments{comments.length > 0 && <span className="interest-count">{comments.length}</span>}
      </h2>

      {comments.length === 0 ? (
        <p className="status-msg-sm">No comments yet. Start the conversation!</p>
      ) : (
        <div className="comment-list">
          {comments.map((c) => (
            <div key={c.$id} className="comment-card">
              <div className="comment-meta">
                <span className="comment-author">{c.personName}</span>
                <span className="comment-time">{timeAgo(c.createdAt)}</span>
                {c.personName === currentName && (
                  <button className="comment-delete" onClick={() => handleDelete(c)} title="Delete comment">×</button>
                )}
              </div>
              <p className="comment-text">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      {currentName ? (
        <form onSubmit={handlePost} className="comment-form">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            className="comment-input"
            rows={2}
            disabled={posting}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={posting || !text.trim()}>
            {posting ? 'Posting...' : 'Post'}
          </button>
        </form>
      ) : (
        <p className="status-msg-sm">Select your name on the Availability page to post comments.</p>
      )}
    </div>
  );
}
