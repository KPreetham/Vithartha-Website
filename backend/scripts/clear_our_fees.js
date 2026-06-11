import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from '../src/models/Service.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('MONGODB_URI is not set in environment. Aborting.');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('Connected to MongoDB');

    const result = await Service.updateMany(
      {},
      { $set: { recommendedFees: '', updatedAt: Date.now() } }
    );

    console.log(`Reset recommendedFees on ${result.modifiedCount || 0} service(s).`);
  } catch (err) {
    console.error('Error clearing recommendedFees:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
