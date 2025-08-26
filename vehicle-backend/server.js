require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors({ origin: ['http://localhost:5173'], methods: ['GET','POST'] }));

// in-memory upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });

// ---- ENV ----
const PORT = Number(process.env.PORT || 5050);
const {
  CUSTOM_VISION_ENDPOINT,
  CUSTOM_VISION_PROJECT_ID,
  CUSTOM_VISION_MODEL_NAME,
  CUSTOM_VISION_PREDICTION_KEY,
  CUSTOM_VISION_TASK
} = process.env;

// basic env check
(function assertEnv(){
  const missing = [];
  for (const k of ['CUSTOM_VISION_ENDPOINT','CUSTOM_VISION_PROJECT_ID','CUSTOM_VISION_MODEL_NAME','CUSTOM_VISION_PREDICTION_KEY']) {
    if (!process.env[k]) missing.push(k);
  }
  if (missing.length) {
    console.error('❌ Missing env:', missing.join(', '));
    process.exit(1);
  }
})();

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// POST /api/classify
app.post('/api/classify', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const task = (CUSTOM_VISION_TASK || 'classify').toLowerCase(); // classify|detect
    const pathTask = task === 'detect' ? 'detect' : 'classify';

    const base = CUSTOM_VISION_ENDPOINT.replace(/\/+$/, '');
    const url = `${base}/customvision/v3.0/Prediction/${CUSTOM_VISION_PROJECT_ID}/${pathTask}/iterations/${encodeURIComponent(CUSTOM_VISION_MODEL_NAME)}/image`;

    // call Azure Prediction API (image bytes)
    const azureResp = await axios.post(url, req.file.buffer, {
      headers: {
        'Prediction-Key': CUSTOM_VISION_PREDICTION_KEY,
        'Content-Type': 'application/octet-stream'
      },
      timeout: 20000,
      validateStatus: () => true
    });

    if (azureResp.status < 200 || azureResp.status >= 300) {
      return res.status(azureResp.status).json(
        typeof azureResp.data === 'object' ? azureResp.data : { error: azureResp.data }
      );
    }

    // Optional: sort predictions server-side for convenience
    const sorted = Array.isArray(azureResp.data?.predictions)
      ? [...azureResp.data.predictions].sort((a, b) => b.probability - a.probability)
      : [];

    res.json({ predictions: sorted });
  } catch (err) {
    console.error('Classification error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Classification failed', detail: err?.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚗 Backend listening on http://localhost:${PORT}`);
});
