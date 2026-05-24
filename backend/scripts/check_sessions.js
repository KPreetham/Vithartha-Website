import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Session from '../src/models/Session.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('✓ Connected to MongoDB');

    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const sessionCollectionExists = collections.some(c => c.name === 'sessions');
    console.log(`✓ 'sessions' collection exists:`, sessionCollectionExists);

    // Count sessions
    const count = await Session.countDocuments();
    console.log(`✓ Total sessions in collection: ${count}`);

    // List all sessions
    if (count > 0) {
      const sessions = await Session.find({}).lean();
      console.log('\nSessions found:');
      sessions.forEach(s => {
        console.log(`  - ID: ${s._id}`);
        console.log(`    User: ${s.user}`);
        console.log(`    Token: ${String(s.token).slice(0, 20)}...`);
        console.log(`    Created: ${s.createdAt}`);
        console.log(`    Expires: ${s.expiresAt}`);
        console.log();
      });
    } else {
      console.log('\nNo sessions found in the collection.');
    }

    // Check indexes
    const indexes = await Session.collection.getIndexes();
    console.log('\nIndexes on sessions collection:');
    Object.keys(indexes).forEach(idx => {
      console.log(`  - ${idx}:`, indexes[idx]);
    });

  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();

