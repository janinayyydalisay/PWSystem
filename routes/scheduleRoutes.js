import express from "express";
import { fetchNextSchedule, completeSchedule } from "../controllers/scheduleController.js";

const router = express.Router();

// Raspberry Pi requests this
router.get("/next", fetchNextSchedule);

// Raspberry Pi marks schedule done
router.post("/complete", completeSchedule);

export default router;
