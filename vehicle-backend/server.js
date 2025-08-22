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
  CUSTOM_VISION_ENDPOINT,        // MUST be Prediction resource endpoint, e.g. https://<prediction>.cognitiveservices.azure.com
  CUSTOM_VISION_PROJECT_ID,      // GUID
  CUSTOM_VISION_MODEL_NAME,      // published iteration name (exact)
  CUSTOM_VISION_PREDICTION_KEY,  // from Prediction resource, not Training
  CUSTOM_VISION_TASK             // "classify" (default) or "detect"
} = process.env;

// Validate env early
(function assertEnv(){
  const missing = [];
  if (!CUSTOM_VISION_ENDPOINT) missing.push('CUSTOM_VISION_ENDPOINT');
  if (!CUSTOM_VISION_PROJECT_ID) missing.push('CUSTOM_VISION_PROJECT_ID');
  if (!CUSTOM_VISION_MODEL_NAME) missing.push('CUSTOM_VISION_MODEL_NAME');
  if (!CUSTOM_VISION_PREDICTION_KEY) missing.push('CUSTOM_VISION_PREDICTION_KEY');
  if (missing.length) {
    console.error('❌ Missing env:', missing.join(', '));
    console.error('Tip: Endpoint/key must be from the **Prediction** resource, not Training.');
    process.exit(1);
  }
})();

app.get('/api/health', (_req,res)=>res.json({ ok:true }));

// Main classify/detect endpoint
app.post('/api/classify', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const task = (CUSTOM_VISION_TASK || 'classify').toLowerCase(); // classify|detect
    const base = CUSTOM_VISION_ENDPOINT.replace(/\/+$/,'');
    const pathTask = task === 'detect' ? 'detect' : 'classify';

    // v3.0 Prediction API for image bytes:
    // {ENDPOINT}/customvision/v3.0/Prediction/{projectId}/{classify|detect}/iterations/{publishedName}/image
    const url = `${base}/customvision/v3.0/Prediction/${CUSTOM_VISION_PROJECT_ID}/${pathTask}/iterations/${encodeURIComponent(CUSTOM_VISION_MODEL_NAME)}/image`;

    console.log('🔎 Azure request:', { url, task: pathTask });

    const azureResp = await axios.post(url, req.file.buffer, {
      headers: { 'Prediction-Key': CUSTOM_VISION_PREDICTION_KEY, 'Content-Type': 'application/octet-stream' },
      timeout: 20000,
      validateStatus: () => true
    });

    if (azureResp.status < 200 || azureResp.status >= 300) {
      console.error('Azure error:', { status: azureResp.status, data: azureResp.data });
      // forward Azure message so the UI can show it
      return res.status(azureResp.status).json({
        error: 'Azure Prediction API error',
        detail: azureResp.data
      });
    }

    return res.json(azureResp.data);
  } catch (err) {
    console.error('Classification error:', err?.response?.data || err.message || err);
    return res.status(500).json({
      error: 'Classification failed',
      detail: err?.response?.data || err.message || 'Unknown server error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚗 Backend listening on http://localhost:${PORT}`);
});
