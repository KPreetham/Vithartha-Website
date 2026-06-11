import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../src/models/Lead.js';
import Service from '../src/models/Service.js';
import { parseFeeAmount } from '../src/utils/servicePricing.js';

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

    const services = await Service.find({}).select('title recommendedFees').lean();
    const leads = await Lead.find({}).select('_id serviceName recommendedFees recommendedFeeAmount').lean();

    const serviceFeeMap = {};
    for (const svc of services) {
      if (svc.recommendedFees) {
        serviceFeeMap[String(svc.title || '').trim().toLowerCase()] = svc.recommendedFees;
      }
    }

    let updatedCount = 0;
    for (const lead of leads) {
      const key = String(lead.serviceName || '').trim().toLowerCase();
      const currentFee = serviceFeeMap[key];
      if (!currentFee) continue;

      const parsedAmount = parseFeeAmount(currentFee);
      const newAmount = parsedAmount != null && parsedAmount > 0 ? parsedAmount : lead.recommendedFeeAmount;

      if (currentFee !== lead.recommendedFees || newAmount !== lead.recommendedFeeAmount) {
        await Lead.updateOne(
          { _id: lead._id },
          { $set: { recommendedFees: currentFee, recommendedFeeAmount: newAmount, updatedAt: Date.now() } }
        );
        updatedCount++;
        console.log(`  Updated "${lead.serviceName}": recommendedFees="${currentFee}", recommendedFeeAmount=${newAmount}`);
      }
    }

    console.log(`\nSynced recommendedFees on ${updatedCount} lead(s).`);

    const all = await Lead.find({}).select('serviceName recommendedFees recommendedFeeAmount cost').lean();
    console.log('\nCurrent leads:');
    all.forEach(l => {
      console.log(`  - ${l.serviceName}: recommendedFees="${l.recommendedFees}", recommendedFeeAmount=${l.recommendedFeeAmount}, cost=${l.cost}`);
    });
  } catch (err) {
    console.error('Error syncing our fees:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
