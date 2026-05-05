const mongoose = require('mongoose');
const User = require('./src/models/User').default || require('./src/models/User');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/vithartha");
  
  const email = `test${Date.now()}@test.com`;
  const password = "password123";

  
  let user = await User.create({
    name: "Test User",
    email: email,
    password: password
  });
  

  
  user = await User.findOne({ email });
  user.googleId = "123456789";
  await user.save();
  
  
  user = await User.findOne({ email });
  
  
  const bcrypt = require('bcryptjs');
  const isMatch = await bcrypt.compare(password, user.password);
  
  
  mongoose.disconnect();
}
test().catch(console.error);
