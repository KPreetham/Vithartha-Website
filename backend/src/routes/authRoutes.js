import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  googleLogin,
  updateUserProfile,
  getAllUsers,
  logoutUser,
  assignUserRole,
  getPRAndExecutors,
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
router.patch("/assign-role", protect, authorize("admin"), assignUserRole);
router.get("/pr-executors", protect, authorize("admin", "PR", "executor", "executorN"), getPRAndExecutors);

export default router;
