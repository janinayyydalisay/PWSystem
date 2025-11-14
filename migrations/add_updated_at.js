import { db } from '../models/db.js';

async function addUpdatedAtField() {
  const collection = db.collection('plants');
  
  try {
    console.log('Starting migration: Adding updatedAt field to plants...');
    
    const snapshot = await collection.get();
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.updatedAt) {
        batch.update(doc.ref, {
          updatedAt: data.createdAt // Initially set updatedAt to createdAt for existing records
        });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`Migration complete: Updated ${count} records`);
    } else {
      console.log('No records needed updating');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

addUpdatedAtField()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });