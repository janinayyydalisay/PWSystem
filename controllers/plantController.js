import { addPlant, getAllPlants, getPlant, updatePlant, deletePlant } from '../models/plantModel.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'plant-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

export async function createPlant(req, res) {
  try {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }

      const plantData = {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        mode: req.body.mode,
        image: req.file ? `/images/${req.file.filename}` : null
      };

      const result = await addPlant(plantData);
      res.json(result);
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPlants(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const { plants, total } = await getAllPlants({ limit, offset, search });
    res.json({ success: true, plants, total });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPlantById(req, res) {
  try {
    const plant = await getPlant(req.params.id);
    if (!plant) {
      return res.status(404).json({ success: false, error: 'Plant not found' });
    }
    res.json({ success: true, plant });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updatePlantById(req, res) {
  try {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }

      const plantId = req.params.id;
      const existingPlant = await getPlant(plantId);
      
      if (!existingPlant) {
        return res.status(404).json({ success: false, error: 'Plant not found' });
      }

      // Handle image removal and replacement
      const shouldRemoveImage = req.body.removeImage === 'true' || req.body.image === '';
      const hasNewImage = !!req.file;
      
      // Delete existing image if being replaced or removed
      if (existingPlant.image && (shouldRemoveImage || hasNewImage)) {
        const oldImagePath = path.join(process.cwd(), 'public', existingPlant.image);
        if (oldImagePath.includes('default-plant.png')) {
          // Skip deleting default image
          console.log('Skipping deletion of default image');
        } else {
          try {
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
              console.log('Successfully deleted old image:', oldImagePath);
            }
          } catch (err) {
            console.error('Error deleting old image:', err);
          }
        }
      }

      const plantData = {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        mode: req.body.mode, // Mode will trigger uniqueId update
        image: req.file ? `/images/${req.file.filename}` : 
               shouldRemoveImage ? '/images/default-plant.png' : 
               existingPlant.image
      };

      const result = await updatePlant(plantId, plantData);
      res.json(result);
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deletePlantById(req, res) {
  try {
    const plantId = req.params.id;
    const plant = await getPlant(plantId);
    
    if (!plant) {
      return res.status(404).json({ success: false, error: 'Plant not found' });
    }

    // Delete image file if exists
    if (plant.image) {
      const imagePath = path.join(process.cwd(), 'public', plant.image);
      try {
        fs.unlinkSync(imagePath);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    const result = await deletePlant(plantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}