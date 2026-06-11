import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../src/models/Lead.js';
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

    const leads = await Lead.find({}).select('_id serviceName marketFees').lean();
    const services = await Service.find({}).select('title marketFees').lean();

    let updatedCount = 0;
    for (const lead of leads) {
      const matchedService = services.find(
        (s) => String(s.title || "").trim().toLowerCase() === String(lead.serviceName || "").trim().toLowerCase()
      );
      if (matchedService) {
        const marketFees = String(matchedService.marketFees || "").trim();
        if (marketFees && marketFees !== (lead.marketFees || "")) {
          await Lead.updateOne(
            { _id: lead._id },
            { $set: { marketFees, updatedAt: Date.now() } }
          );
          updatedCount++;
          console.log(`  Updated lead "${lead.serviceName}": marketFees = "${marketFees}"`);
        }
      }
    }

    console.log(`\nUpdated marketFees on ${updatedCount} lead(s).`);

    const all = await Lead.find({}).select('serviceName recommendedFees marketFees cost').lean();
    console.log('\nCurrent leads:');
    all.forEach(l => {
      console.log(`  - ${l.serviceName}: recommendedFees="${l.recommendedFees}", marketFees="${l.marketFees || ''}", cost=${l.cost}`);
    });
  } catch (err) {
    console.error('Error syncing market fees:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
