import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userAgent: { type: String },
    ip: { type: String },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'sessions' },
);

const Session = mongoose.model('Session', SessionSchema);

export default Session;
