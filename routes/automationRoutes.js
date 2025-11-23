// routes/automationRoutes.js
const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');

router.get('/status', automationController.getStatus);        // GET /automation/status
router.post('/toggle', automationController.toggle);          // POST /automation/toggle { enable: true/false }
router.post('/update', automationController.receiveUpdate);   // POST /automation/update  (from Pi)
router.get('/last', automationController.getLastUpdate);      // GET /automation/last

module.exports = router;
