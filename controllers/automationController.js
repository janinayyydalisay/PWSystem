// controllers/automationController.js
let autoMode = false; // in-memory; restart -> default false
let lastUpdate = null;

exports.getStatus = (req, res) => {
  return res.json({ success: true, autoMode });
};

exports.toggle = (req, res) => {
  const { enable } = req.body;
  if (typeof enable !== 'boolean') {
    return res.status(400).json({ success: false, error: 'enable must be boolean' });
  }
  autoMode = enable;
  return res.json({ success: true, autoMode });
};

exports.receiveUpdate = (req, res) => {
  // expected payload from Pi
  const payload = req.body || {};
  lastUpdate = {
    receivedAt: new Date().toISOString(),
    data: payload
  };
  // You may choose to save into DB here (firebase or MySQL). For now we just store in memory.
  console.log('Automation update received:', JSON.stringify(lastUpdate, null, 2));
  return res.json({ success: true });
};

exports.getLastUpdate = (req, res) => {
  if (!lastUpdate) {
    return res.json({ success: true, lastUpdate: null });
  }
  return res.json({ success: true, lastUpdate });
};
