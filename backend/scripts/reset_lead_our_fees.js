import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../src/models/Lead.js';

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

    const result = await Lead.updateMany(
      {},
      {
        $set: {
          recommendedFees: 'Rs. 1',
          recommendedFeeAmount: 1,
          cost: 1,
          updatedAt: Date.now(),
        }
      }
    );

    console.log(`Updated ${result.modifiedCount || 0} lead(s) with Our Fee = Rs. 1.`);

    const all = await Lead.find({}).select('serviceName recommendedFees recommendedFeeAmount cost').lean();
    console.log('\nCurrent leads:');
    all.forEach(l => {
      console.log(`  - ${l.serviceName}: recommendedFees="${l.recommendedFees}", cost=${l.cost}`);
    });
  } catch (err) {
    console.error('Error updating leads:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
