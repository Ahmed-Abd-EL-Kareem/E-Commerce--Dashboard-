import express from "express";
import {
  addToCart,
  getCart,
  removeFromCart,
  updateCartItemQuantity,
  updateCartItemNotes,
  updateCartNotes,
  applyDiscount,
  clearCart,
  getAllCarts,
  deleteCartById,
  updateCartById,
  fixCartPrices,
  getCartAnalytics,
} from "./cartController.js";
import { protect, restrictTo } from "../../middleware/authorization.js";

const router = express.Router();

// All cart routes require authentication
router.use(protect);

// Admin routes
router.get("/admin", restrictTo("admin"), getAllCarts);
router.get("/admin/analytics", restrictTo("admin"), getCartAnalytics);
router.post("/admin/fix-prices", restrictTo("admin"), fixCartPrices);
router.delete("/admin/:cartId", restrictTo("admin"), deleteCartById);
router.patch("/admin/:cartId", restrictTo("admin"), updateCartById);

// User cart routes
router.route("/").get(getCart).post(addToCart).delete(clearCart);

// Cart management routes
router.patch("/notes", updateCartNotes);
router.patch("/discount", applyDiscount);

// Item management routes
router
  .route("/:productId/:sku")
  .delete(removeFromCart)
  .patch(updateCartItemQuantity);

router.patch("/:productId/:sku/notes", updateCartItemNotes);

export default router;
