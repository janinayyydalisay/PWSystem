import { db } from './models/db.js';

async function initializeFirebase() {
  try {
    // Test the connection by performing a simple operation
    const testDoc = db.collection('test').doc('connection-test');
    await testDoc.set({
      timestamp: new Date(),
      test: 'Connection successful'
    });
    await testDoc.delete();
    
    console.log('✅ Connected to Firebase successfully!');
    

    const usersRef = db.collection('users');
    const schema = {
      timestamp: new Date(),
      initialized: true
    };
    
    await usersRef.doc('schema').set(schema);
    console.log('✅ Database collections initialized!');
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  } finally {
    process.exit();
  }
}

initializeFirebase();