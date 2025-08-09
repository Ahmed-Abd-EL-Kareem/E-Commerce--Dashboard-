import express from "express";
import {
  getAllOrders,
  getUserOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
  updatePaymentStatus,
} from "./orderController.js";
import { protect, admin } from "../../middleware/authorization.js";

const router = express.Router();


router.use(protect); 

// User routes
router.route("/myorders").get(getUserOrders);
router.route("/").post(createOrder);
router.route("/:id").get(getOrderById);
router.route("/:id/cancel").put(cancelOrder);

// Admin routes
router.use(admin); // All routes below require admin privileges
router.route("/").get(getAllOrders);
router.route("/:id/status").put(updateOrderStatus);
router.route("/:id/payment").put(updatePaymentStatus);
router.route("/:id").delete(deleteOrder);

export default router;
