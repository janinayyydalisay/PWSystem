import { createSchedule, getNextSchedule, markScheduleCompleted } from '../models/scheduleModel.js';

export async function addSchedule(req, res) {
  const schedule = req.body;

  if (!schedule.plantName) {
    return res.status(400).json({ success: false, error: 'Plant name is required' });
  }

  const result = await createSchedule(schedule);

  if (result.success) {
    return res.json({ success: true, id: result.id });
  } else {
    return res.status(500).json({ success: false, error: result.error });
  }
}

export async function fetchNextSchedule(req, res) {
  try {
    const result = await getNextSchedule();   // result = { success, schedule }

    if (!result.success) {
      return res.json({ success: false, schedule: null });
    }

    // Send ONLY the actual schedule object
    return res.json({
      success: true,
      schedule: result.schedule
    });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
}


export async function completeSchedule(req, res) {
  try {
    const { scheduleId } = req.body;
    if (!scheduleId) return res.json({ success: false, error: "Missing scheduleId" });

    await markScheduleCompleted(scheduleId);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
}