import { getStorage } from 'firebase-admin/storage';
import { db } from '../models/db.js';
import fs from 'fs';
import path from 'path';

export async function uploadImage(file) {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `plant-${timestamp}${extension}`;
    
  
    const filepath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filepath, file.buffer);

    // Return the full URL path to be stored in the database
    return `/images/${filename}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// Function to delete image
export async function deleteImage(imagePath) {
  try {
    if (!imagePath) return;

    // Extract filename from path
    const filename = imagePath.split('/').pop();
    const filepath = path.join(process.cwd(), 'public', 'images', filename);
    
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}
