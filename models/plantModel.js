import { db } from './db.js';

const collection = db.collection('plants');

export async function addPlant(data) {
  try {
    const name = data.name || '';
    const description = data.description || '';
    
    // Create searchable terms from name and description
    const searchTerms = [
      ...new Set([
        ...name.toLowerCase().split(/\s+/),
        ...description.toLowerCase().split(/\s+/)
      ])
    ].filter(term => term.length > 0);

    // Generate unique ID based on mode
    const mode = data.mode || 'manual';
    const timestamp = Date.now();
    const prefix = mode === 'manual' ? 'm-' : mode === 'automatic' ? 'a-' : 's-';
    const uniqueId = `${prefix}${timestamp}`;

    const payload = {
      uniqueId,
      name,
      description,
      status: data.status || 'unknown',
      mode: mode,
      image: data.image || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      searchTerms
    };
    const docRef = await collection.add(payload);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getAllPlants({ limit = 10, offset = 0, search = '' } = {}) {
  try {
    let query = collection.orderBy('createdAt', 'desc');
    
    // If search term provided, filter by name or description
    if (search) {
      const searchLower = search.toLowerCase();
      query = collection.where('searchTerms', 'array-contains', searchLower);
    }

    // Get total count (for pagination)
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Apply pagination
    query = query.limit(limit).offset(offset);
    const snapshot = await query.get();

    const plants = snapshot.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt;
      const createdAtISO = createdAt && createdAt.toDate ? createdAt.toDate().toISOString() : (createdAt && createdAt.toISOString ? createdAt.toISOString() : null);
      return {
        id: doc.id,
        uniqueId: data.uniqueId || '',
        name: data.name || '',
        description: data.description || '',
        status: data.status || '',
        mode: data.mode || 'manual',
        image: data.image || null,
        createdAt: createdAtISO,
      updatedAt: data.updatedAt?.toDate().toISOString() || createdAtISO
      };
    });
    
    return { plants, total };
  } catch (error) {
    throw error;
  }
}

export async function getPlant(id) {
  try {
    const doc = await collection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data();
    const createdAt = data.createdAt;
    const createdAtISO = createdAt && createdAt.toDate ? createdAt.toDate().toISOString() : (createdAt && createdAt.toISOString ? createdAt.toISOString() : null);
    return {
      id: doc.id,
      uniqueId: data.uniqueId || '',
      name: data.name || '',
      description: data.description || '',
      status: data.status || '',
      mode: data.mode || 'manual',
      image: data.image || null,
      createdAt: createdAtISO,
      updatedAt: data.updatedAt?.toDate().toISOString() || createdAtISO
    };
  } catch (error) {
    throw error;
  }
}

export async function updatePlant(id, data) {
  try {
    const name = data.name;
    const description = data.description;
    const mode = data.mode;
    
    // Update search terms if name or description changes
    let searchTerms;
    if (name !== undefined || description !== undefined) {
      const doc = await collection.doc(id).get();
      const currentData = doc.data();
      searchTerms = [
        ...new Set([
          ...(name || currentData.name || '').toLowerCase().split(/\s+/),
          ...(description || currentData.description || '').toLowerCase().split(/\s+/)
        ])
      ].filter(term => term.length > 0);
    }

    // Generate new uniqueId if mode changes
    let uniqueId;
    if (mode !== undefined) {
      const prefix = mode === 'manual' ? 'm-' : mode === 'automatic' ? 'a-' : 's-';
      uniqueId = `${prefix}${Date.now()}`;
    }

    const payload = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.image !== undefined && { image: data.image }),
      ...(mode !== undefined && { mode, uniqueId }),
      ...(searchTerms && { searchTerms }),
      updatedAt: new Date() // Add timestamp on every update
    };
    await collection.doc(id).update(payload);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deletePlant(id) {
  try {
    await collection.doc(id).delete();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Return counts of plants grouped by mode (automatic, manual, scheduled)
export async function getModeUsageCounts() {
  try {
    const snapshot = await collection.get();
    const counts = { automatic: 0, manual: 0, scheduled: 0 };
    snapshot.forEach(doc => {
      const mode = (doc.data() && doc.data().mode) ? doc.data().mode : 'manual';
      if (mode === 'automatic') counts.automatic++;
      else if (mode === 'scheduled') counts.scheduled++;
      else counts.manual++;
    });
    return counts;
  } catch (error) {
    throw error;
  }
}
