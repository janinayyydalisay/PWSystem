// ...existing code...
import { db } from './db.js';

// ...existing code...
export async function getPumpActivities(
  startDate = new Date(Date.now() - 24 * 60 * 60 * 1000),
  mode
) {
  try {
    let query = db.collection('pumpActivities')
      .where('startTime', '>=', startDate)
      .orderBy('startTime', 'desc')
      .limit(50);

    if (mode) {
      query = query.where('mode', '==', mode);
    }

    const snapshot = await query.get();
    return { success: true, activities: mapActivities(snapshot) };
  } catch (error) {
    if (error.code === 9 && String(error.details).includes('index')) {
      if (!process.env.SUPPRESS_INDEX_WARNING) {
        // Remove this line after index created
        console.warn('Index missing; using fallback in-memory filter.');
      }
      const fallback = await db.collection('pumpActivities')
        .orderBy('startTime', 'desc')
        .limit(120)
        .get();
      const filtered = mapActivities(fallback)
        .filter(a => a.startTime >= startDate && (!mode || a.mode === mode))
        .slice(0, 50);
      return {
        success: true,
        activities: filtered,
        warning: process.env.SUPPRESS_INDEX_WARNING ? undefined :
          'Create composite index: Collection pumpActivities, mode Asc, startTime Desc.'
      };
    }
    return { success: false, error: error.message };
  }
}
// ...existing code...

function mapActivities(snapshot) {
  const out = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const start = data.startTime?.toDate ? data.startTime.toDate() : data.startTime;
    out.push({
      id: doc.id,
      startTime: start,
      duration: data.duration,
      mode: data.mode,
      details: data.details || {}
    });
  });
  return out;
}

// Track current device state (single doc)
export async function setDeviceState(partial) {
  try {
    const ref = db.collection('deviceStates').doc('main');
    await ref.set({ updatedAt: new Date(), ...partial }, { merge: true });
    const snap = await ref.get();
    return { success: true, state: snap.data() };
  } catch (error) {
    console.error('Error setting device state:', error);
    return { success: false, error: error.message };
  }
}

export async function getDeviceState() {
  try {
    const ref = db.collection('deviceStates').doc('main');
    const snap = await ref.get();
    if (!snap.exists) return { success: true, state: { mode: 'manual', pump: 'OFF', updatedAt: new Date() } };
    return { success: true, state: snap.data() };
  } catch (error) {
    console.error('Error getting device state:', error);
    return { success: false, error: error.message };
  }
}

// Record new pump activity
export async function recordPumpActivity(activity) {
    try {
        const activitiesRef = db.collection('pumpActivities');
        const result = await activitiesRef.add({
            startTime: new Date(),
            duration: activity.duration,
            mode: activity.mode,
            trigger: activity.trigger, // 'manual_button', 'schedule', 'moisture_low'
            details: {
                moistureLevel: activity.moistureLevel, // for automatic mode
                scheduledTime: activity.scheduledTime, // for scheduled mode
                plantId: activity.plantId,            // plant being watered
                plantName: activity.plantName         // plant name for reference
            }
        });

        return { success: true, id: result.id };
    } catch (error) {
        console.error('Error recording pump activity:', error);
        return { success: false, error: error.message };
    }
}

// Get daily watering frequency for the last 7 days
export async function getDailyWateringFrequency() {
    try {
        const activitiesRef = db.collection('pumpActivities');
        // Get activities from last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const snapshot = await activitiesRef
            .where('startTime', '>=', sevenDaysAgo)
            .orderBy('startTime', 'desc')
            .get();

        // Initialize counts for each day
        const dailyCounts = {};
        const modeCountsByDay = {};

        // Format date as YYYY-MM-DD
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        // Initialize the last 7 days with zero counts
        for (let i = 0; i < 7; i++) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dateStr = formatDate(date);
            dailyCounts[dateStr] = 0;
            modeCountsByDay[dateStr] = {
                manual: 0,
                automatic: 0,
                scheduled: 0
            };
        }

        // Count activities for each day
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = formatDate(data.startTime.toDate());
            if (dailyCounts[date] !== undefined) {
                dailyCounts[date]++;
                // Count by mode
                if (data.mode && modeCountsByDay[date]) {
                    modeCountsByDay[date][data.mode]++;
                }
            }
        });

        // Convert to arrays for chart data
        const dates = Object.keys(dailyCounts).sort();
        const data = {
            dates,
            totalCounts: dates.map(date => dailyCounts[date]),
            modeCounts: dates.map(date => ({
                manual: modeCountsByDay[date].manual,
                automatic: modeCountsByDay[date].automatic,
                scheduled: modeCountsByDay[date].scheduled
            }))
        };

        return { success: true, data };
    } catch (error) {
        console.error('Error getting daily watering frequency:', error);
        return { success: false, error: error.message };
    }
}