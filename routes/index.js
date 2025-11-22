import express from "express";
import { homePage, dashboardPage, analyticsPage, modeUsageApi } from "../controllers/homeController.js";
import { getPumpActivityData, recordActivity, getDailyFrequency, manualPumpOn, manualPumpOff, pumpStatus } from "../controllers/pumpActivityController.js";
import { getModeTableData } from "../controllers/exportController.js";
import plantRoutes from './plantRoutes.js';
import scheduleRoutes from "./scheduleRoutes.js";

import { addSchedule } from "../controllers/scheduleController.js";

const router = express.Router();

// Page routes
router.get("/", homePage);
router.get("/manual", (req, res) => {
  res.render("manual", { title: "Manual Mode" });
});
router.get("/automatic", (req, res) => {
  res.render("automatic", { title: "Automatic Mode" });
});
router.get("/scheduled", (req, res) => {
  res.render("scheduled", { title: "Scheduled Mode" });
});
router.get("/dashboard", dashboardPage);
router.get("/analytics", analyticsPage);
router.get('/api/mode-usage', modeUsageApi);

// Pump activity routes
router.get('/api/pump-activity', getPumpActivityData);
router.post('/api/pump-activity', recordActivity);
router.get('/api/pump-activity/daily', getDailyFrequency);

// Export routes
router.get('/api/table-data/:mode', getModeTableData);

router.post('/api/pump/manual/on', manualPumpOn);
router.post('/api/pump/manual/off', manualPumpOff);
router.get('/api/pump/status', pumpStatus);

// Schedule API (create)
router.post('/api/schedules', addSchedule);

// API routes
router.use('/api/plants', plantRoutes);
router.use("/schedules", scheduleRoutes);


export default router;
