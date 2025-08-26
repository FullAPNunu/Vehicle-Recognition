import { useState, useMemo } from 'react';
import axios from 'axios';

const API_HOST = import.meta.env.VITE_API_HOST;

export default function VehicleClassifier() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPredictions([]);
    setError('');
    if (f) setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return setError('Please choose an image first.');
    setLoading(true);
    setError('');
    setPredictions([]);

    try {
      const fd = new FormData();
      fd.append('image', file);

      const { data } = await axios.post(`${API_HOST}/api/classify`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 20000
      });

      const preds = Array.isArray(data?.predictions) ? data.predictions : [];
      setPredictions(preds);
    } catch (err) {
      const detail = err?.response?.data || err.message || 'Request failed';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  const top = useMemo(() => {
    return predictions?.length ? predictions[0] : null;
  }, [predictions]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24
    }}>
      {/* Left: upload + preview */}
      <div>
        <h2 style={{ marginBottom: 8 }}>🚗 Vehicle Classifier</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          style={{ marginBottom: 12 }}
        />
        <div>
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            style={{
              background: '#222',
              color: '#eee',
              border: '1px solid #444',
              padding: '8px 14px',
              borderRadius: 6,
              cursor: loading || !file ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Classifying…' : 'Upload & Classify'}
          </button>
        </div>

        {error && (
          <pre style={{ color: 'tomato', marginTop: 16, whiteSpace: 'pre-wrap' }}>
            {error}
          </pre>
        )}

        {preview && (
          <div style={{ marginTop: 16 }}>
            <img
              src={preview}
              alt="preview"
              style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #333' }}
            />
          </div>
        )}
      </div>

      {/* Right: results */}
      <div>
        <h3 style={{ marginTop: 28, marginBottom: 8 }}>Result</h3>

        {!predictions?.length && !loading && (
          <div style={{ color: '#aaa' }}>No result yet. Choose an image and click “Upload & Classify”.</div>
        )}

        {top && (
          <div style={{
            background: '#181818',
            border: '1px solid #333',
            borderRadius: 10,
            padding: 16,
            marginBottom: 16
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>
              <strong>Top Prediction:</strong> {top.tagName}
            </div>
            <div>Confidence: {(top.probability * 100).toFixed(2)}%</div>
          </div>
        )}

        {predictions?.length > 0 && (
          <div>
            <div style={{ marginBottom: 8, color: '#aaa' }}>All predictions</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {predictions.map((p) => (
                <li key={p.tagId + p.tagName} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{p.tagName}</span>
                    <span>{(p.probability * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{
                    height: 8,
                    background: '#222',
                    borderRadius: 999,
                    overflow: 'hidden',
                    border: '1px solid #333'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round(p.probability * 100)}%`,
                      background: '#4f46e5'
                    }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
