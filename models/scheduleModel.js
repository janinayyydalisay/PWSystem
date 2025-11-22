import { db } from "./db.js";

const collection = db.collection("schedules");

export async function createSchedule(schedule) {
  try {
    const now = new Date();

    // Remove previous schedules for same plant
    await deleteScheduleByPlantName(schedule.plantName);

    await collection.add({
      plantId: schedule.plantId || null,
      plantName: schedule.plantName || "",
      frequency: schedule.frequency,       // "daily" | "weekly"
      timeOfDay: schedule.timeOfDay,       // "HH:mm"
      durationSec: Number(schedule.durationSec),
      daysOfWeek: schedule.daysOfWeek || [],
      createdAt: now,
      updatedAt: now,
      active: true     // we use "active" instead of "completed"
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


export async function deleteScheduleByPlantName(plantName) {
  try {
    const snap = await collection.where("plantName", "==", plantName).get();
    const batch = db.batch();

    snap.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


/* --------------------------------------------------------
   🟢 FIXED: COMPUTE NEXT SCHEDULE TIME BASED ON YOUR FIELDS
   -------------------------------------------------------- */
export async function getNextSchedule() {
  try {
    const snap = await collection.where("active", "==", true).get();

    if (snap.empty) {
      return { success: true, schedule: null };
    }

    let soonest = null;

    for (const doc of snap.docs) {
      const data = doc.data();
      const nextTimeISO = computeNextRun(data);  // ALWAYS ISO string

      if (!nextTimeISO) continue;

      const nextDate = new Date(nextTimeISO);

      if (!soonest || nextDate < new Date(soonest.fullDateTime)) {
        soonest = {
          id: doc.id,
          plantId: data.plantId,
          plantName: data.plantName,
          durationSec: data.durationSec,
          fullDateTime: nextTimeISO  // ALWAYS ISO STRING
        };
      }
    }

    return { success: true, schedule: soonest };

  } catch (err) {
    console.error("Next schedule error:", err);
    return { success: false, error: err.message };
  }
}



/* --------------------------------------------------------
   🧠 Compute next full datetime for "daily" or "weekly"
   -------------------------------------------------------- */
function computeNextRun(schedule) {
  const now = new Date();

  // Extract "HH:mm"
  const [hour, minute] = schedule.timeOfDay.split(":").map(Number);

  let next = new Date();
  next.setHours(hour, minute, 0, 0);

  /* ----- DAILY ----- */
  if (schedule.frequency === "daily") {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }

  /* ----- WEEKLY ----- */
  if (schedule.frequency === "weekly" && schedule.daysOfWeek.length > 0) {
    let soonest = null;

    for (const day of schedule.daysOfWeek) {
      const temp = new Date(next);
      const diff = (day + 7 - now.getDay()) % 7;

      temp.setDate(now.getDate() + diff);

      if (diff === 0 && temp <= now) {
        temp.setDate(temp.getDate() + 7);
      }

      if (!soonest || temp < soonest) soonest = temp;
    }

    return soonest.toISOString();
  }

  return null;
}


/* --------------------------------------------------------
   🟥 Mark schedule as inactive instead of completed
   -------------------------------------------------------- */
export async function markScheduleCompleted(scheduleId) {
  try {
    await collection.doc(scheduleId).update({
      active: false,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
