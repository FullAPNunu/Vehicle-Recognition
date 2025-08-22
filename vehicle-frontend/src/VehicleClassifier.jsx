import { useState } from 'react';
import axios from 'axios';

const API_HOST = import.meta.env.VITE_API_HOST;

export default function VehicleClassifier() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return setError('Please choose an image first');
    setLoading(true); setError(null); setResult(null);

    try {
      const fd = new FormData();
      fd.append('image', file);

      const { data } = await axios.post(`${API_HOST}/api/classify`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 20000
      });

      setResult(data);
    } catch (err) {
      console.error(err);
      // Surface backend/azure detail if present
      const detail = err?.response?.data?.detail;
      const msg =
        (typeof detail === 'string' && detail) ||
        (detail ? JSON.stringify(detail) : err?.message || 'Network/Server error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const topPrediction =
    result?.predictions?.length
      ? [...result.predictions].sort((a,b) => b.probability - a.probability)[0]
      : null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 48, marginBottom: 8 }}>Mission Ready Vehicle Demo</h1>
      <h2 style={{ marginBottom: 16 }}>🚗 Vehicle Classifier</h2>

      <input type="file" accept="image/*" onChange={onFileChange} />
      {file && <div style={{ marginTop: 8 }}>{file.name}</div>}

      <div style={{ marginTop: 12 }}>
        <button onClick={handleUpload} disabled={loading}>
          {loading ? 'Classifying…' : 'Upload & Classify'}
        </button>
      </div>

      {error && (
        <pre style={{ color: 'tomato', marginTop: 16, whiteSpace: 'pre-wrap' }}>
          {String(error)}
        </pre>
      )}

      {topPrediction && (
        <div style={{ marginTop: 16 }}>
          <div><strong>Top class:</strong> {topPrediction.tagName}</div>
          <div><strong>Confidence:</strong> {(topPrediction.probability * 100).toFixed(2)}%</div>
        </div>
      )}

      {result && !topPrediction && (
        <pre style={{ marginTop: 16 }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
