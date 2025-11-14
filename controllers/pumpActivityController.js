import { getPumpActivities, recordPumpActivity } from '../models/pumpActivityModel.js';

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