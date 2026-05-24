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
    console.log('Connected to MongoDB');

    const indexes = await Session.collection.indexes();
    const ttlIndex = indexes.find((index) => index.key && index.key.expiresAt === 1 && index.expireAfterSeconds === 0);

    if (!ttlIndex) {
      console.log('No TTL index found on expiresAt.');
      return;
    }

    console.log(`Dropping TTL index: ${ttlIndex.name}`);
    await Session.collection.dropIndex(ttlIndex.name);
    console.log('TTL index dropped successfully.');
  } catch (err) {
    console.error('Failed to drop TTL index:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
