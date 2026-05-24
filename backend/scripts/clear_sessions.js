import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('MONGODB_URI is not set in environment. Aborting.');
  process.exit(1);
}

const SessionSchema = new mongoose.Schema({}, { strict: false, collection: 'sessions' });
const Session = mongoose.model('Session', SessionSchema);

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('Connected to MongoDB');

    const result = await Session.deleteMany({});
    console.log(`Deleted ${result.deletedCount || 0} session(s) from the 'sessions' collection.`);
  } catch (err) {
    console.error('Error clearing sessions:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
