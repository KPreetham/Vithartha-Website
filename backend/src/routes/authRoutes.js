import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  googleLogin,
  updateUserProfile,
  getAllUsers,
  logoutUser,
} from "../controllers/authController.js";
import { protect, admin, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google-login", googleLogin);
router.post('/logout', protect, logoutUser);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.get("/users", protect, authorize("admin", "PR"), getAllUsers);

export default router;
