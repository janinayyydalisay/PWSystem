export const homePage = (req, res) => {
  res.render("home");
};

export const dashboardPage = (req, res) => {
  res.render("dashboard");
};

export const analyticsPage = (req, res) => {
  res.render("analytics");
};

import * as plantModel from '../models/plantModel.js';

export const modeUsageApi = async (req, res) => {
  try {
    const counts = await plantModel.getModeUsageCounts();
    res.json({ success: true, counts });
  } catch (error) {
    console.error('Error fetching mode usage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
