import VehicleClassifier from './VehicleClassifier';

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#111',
      color: '#eee',
      padding: '32px 20px',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: 900 }}>
        <h1 style={{ fontSize: 42, marginBottom: 24 }}>Mission Ready Vehicle Demo</h1>
        <VehicleClassifier />
      </div>
    </div>
  );
}
