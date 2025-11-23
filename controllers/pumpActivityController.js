// ...existing code...
import fetch from "node-fetch";
import { 
  getPumpActivities, 
  recordPumpActivity, 
  setDeviceState, 
  getDeviceState 
} from "../models/pumpActivityModel.js";

const RPI_HOST = process.env.RPI_HOST || "192.168.130.218";  // your Pi IP
const RPI_PORT = process.env.RPI_PORT || "5000";
const RPI_URL = `http://${RPI_HOST}:${RPI_PORT}/pump`;

async function sendPiCommand(action, payload = {}) {
  const res = await fetch(RPI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  if (!res.ok) throw new Error(`Pi error ${res.status}`);
  return res.json();
}

export async function manualPumpOn(req, res) {
  try {
    const { plantId, plantName } = req.body;

    await sendPiCommand("on", { plantName });
    await setDeviceState({ pump: "ON", mode: "manual", plantId, plantName });

    await recordPumpActivity({
      duration: 0,
      mode: "manual",
      trigger: "manual_button",
      plantId,
      plantName
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function manualPumpOff(req, res) {
  try {
    await sendPiCommand("off");

    const state = await getDeviceState();

    await setDeviceState({ pump: "OFF", mode: "manual", plantId: null, plantName: null });

    await recordPumpActivity({
      duration: 0,
      mode: "manual",
      trigger: "manual_button",
      plantId: state.state.plantId,
      plantName: state.state.plantName
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function pumpStatus(req, res) {
  try {
    const result = await getDeviceState();
    if (!result.success) throw new Error(result.error || 'Failed to get status');
    res.json({ success: true, state: result.state });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPumpActivityData(req, res) {
    try {
        // Default to last 24 hours if no date range specified
        const startDate = req.query.startDate 
            ? new Date(req.query.startDate)
            : new Date(Date.now() - 24 * 60 * 60 * 1000);

        const mode = req.query.mode; // Get mode from query parameter
        const result = await getPumpActivities(startDate, mode);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function recordActivity(req, res) {
    try {
        const activity = {
            duration: req.body.duration,
            mode: req.body.mode
        };

        const result = await recordPumpActivity(activity);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function getDailyFrequency(req, res) {
    try {
        const { getDailyWateringFrequency } = await import('../models/pumpActivityModel.js');
        const result = await getDailyWateringFrequency();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}