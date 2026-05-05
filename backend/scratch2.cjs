const mongoose = require('mongoose');
const User = require('./src/models/User').default || require('./src/models/User');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/vithartha");
  
  const email = `test${Date.now()}@test.com`;
  const password = "password123";

  console.log("1. Creating user manually...");
  let user = await User.create({
    name: "Test User",
    email: email,
    password: password
  });
  console.log("Created user with password:", user.password); // Should be hashed

  console.log("2. Simulating Google Login (linking)...");
  user = await User.findOne({ email });
  user.googleId = "123456789";
  await user.save();
  
  console.log("3. Verifying password after linking...");
  user = await User.findOne({ email });
  console.log("Password after save:", user.password);
  
  const bcrypt = require('bcryptjs');
  const isMatch = await bcrypt.compare(password, user.password);
  console.log("Password matches original:", isMatch);
  
  mongoose.disconnect();
}
test().catch(console.error);
