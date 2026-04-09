import { useState } from 'react';
import { storage, databases, DATABASE_ID, DOCUMENTS_ID, BUCKET_ID } from '../lib/appwrite';
import { ID } from 'appwrite';

export default function DocumentUpload({ tripId, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), file);
      const fileUrl = storage.getFileView(BUCKET_ID, uploaded.$id).href;

      const doc = await databases.createDocument(DATABASE_ID, DOCUMENTS_ID, ID.unique(), {
        tripId,
        fileName: file.name,
        fileUrl,
        fileId: uploaded.$id,
      });

      onUploaded(doc);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="doc-upload">
      <label className="btn btn-secondary upload-btn">
        {uploading ? 'Uploading...' : '+ Upload File'}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gpx,.txt,.kml"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
      {error && <p className="alert alert-error">{error}</p>}
    </div>
  );
}
