import express from 'express';
import { 
  createPlant, 
  getPlants, 
  getPlantById, 
  updatePlantById, 
  deletePlantById 
} from '../controllers/plantController.js';

const router = express.Router();

// List plants
router.get('/', getPlants);

// Get single plant
router.get('/:id', getPlantById);

// Create plant
router.post('/', createPlant);

// Update plant
router.put('/:id', updatePlantById);

// Delete plant
router.delete('/:id', deletePlantById);

// Water plant manually
router.post('/:id/water', async (req, res) => {
  try {
    const plant = await getPlant(req.params.id);
    if (!plant) {
      return res.status(404).json({ success: false, error: 'Plant not found' });
    }

    // Update plant to watering state
    await updatePlant(req.params.id, {
      status: 'watering',
      lastWatered: new Date(),
      wateringMode: 'manual'
    });

    // After 30 seconds, set the status back to idle
    setTimeout(async () => {
      try {
        await updatePlant(req.params.id, {
          status: 'idle'
        });
      } catch (error) {
        console.error('Error updating plant status:', error);
      }
    }, 30000);

    res.json({ success: true, message: 'Plant watering initiated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;