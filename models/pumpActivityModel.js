import { db } from './db.js';

// Get pump activities within a time range
export async function getPumpActivities(startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    try {
        const activitiesRef = db.collection('pumpActivities');
        const snapshot = await activitiesRef
            .where('startTime', '>=', startDate)
            .orderBy('startTime', 'desc')
            .limit(50)
            .get();

        const activities = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
                id: doc.id,
                startTime: data.startTime.toDate(),
                duration: data.duration,
                mode: data.mode
            });
        });

        return { success: true, activities };
    } catch (error) {
        console.error('Error getting pump activities:', error);
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