import asyncHandler from "express-async-handler";
import { AppError } from "../../utils/appError.js";
import Cart from "./cartModel.js";
import Product from "../product/productModel.js";

// Helper function to get localized response based on Accept-Language header
const getLocalizedResponse = (req, cart) => {
  const lang = req.headers["accept-language"]?.startsWith("ar") ? "ar" : "en";
  const cartObj = cart.toObject();

  // Add localized display fields
  if (cart.statusDisplay) {
    cartObj.statusText = cart.statusDisplay[lang];
  }

  // Add localized discount text
  if (cart.discountText) {
    cartObj.discountMessage = cart.discountText[lang];
  }

  // Add localized notes if they exist
  if (cart.notes && cart.notes[lang]) {
    cartObj.notesText = cart.notes[lang];
  }

  // Add localized discount description if it exists
  if (cart.discountDescription && cart.discountDescription[lang]) {
    cartObj.discountDescriptionText = cart.discountDescription[lang];
  }

  return cartObj;
};

// Helper function to get all carts data (for internal use in controller)
const getAllCartsData = async (req) => {
  const carts = await Cart.find()
    .populate("user", "firstName lastName email phoneNumber")
    .populate("items.product", "name images variants")
    .sort({ createdAt: -1 });

  // Calculate totals for each cart with localization and enriched items
  const cartsWithTotals = carts.map((cart) => {
    const localizedCart = getLocalizedResponse(req, cart);

    // Enrich items with variant information and calculate totals
    const enrichedItems = [];
    let grandTotal = 0;
    let needsUpdate = false;

    for (const item of cart.items) {
      const product = item.product;

      // Find variant option by SKU for additional info
      let matchedOption = null;
      let matchedVariant = null;

      // Search through all variants and options
      for (const variant of product?.variants || []) {
        matchedOption = variant.options?.find((opt) => opt.sku === item.sku);
        if (matchedOption) {
          matchedVariant = variant;
          break;
        }
      }

      // Use the price stored in cart item, fallback to variant price if needed
      let price = item.price || 0;

      // If item price is 0 or missing, try to get it from variant
      if (price === 0 && matchedOption) {
        price = matchedOption.priceAfterDiscount || matchedOption.price || 0;
        // Mark that we need to update this cart item
        if (price > 0) {
          needsUpdate = true;
        }
      }

      const totalPrice = price * item.quantity;
      grandTotal += totalPrice;

      // Get all variant images for this option
      const variantImages = matchedOption?.variantImages || [];

      // Get product images as fallback
      const productImages = product.images || [];

      enrichedItems.push({
        _id: item._id,
        productId: product._id,
        sku: item.sku,
        quantity: item.quantity,
        notes: item.notes,
        productName: product.name,
        // Return all variant images if available, otherwise product images
        images: variantImages.length > 0 ? variantImages : productImages,
        price,
        totalPrice,
        variant: {
          label: matchedOption?.value,
          color: matchedOption?.colorName,
          colorHex: matchedOption?.colorHex,
          storage: matchedOption?.storage,
          ram: matchedOption?.ram,
          stock: matchedOption?.stock,
          // Include the parent variant name
          type: matchedVariant?.name,
        },
      });
    }

    // Update cart items with correct prices if needed
    if (needsUpdate) {
      cart.items.forEach((item, index) => {
        const enrichedItem = enrichedItems[index];
        if (enrichedItem && enrichedItem.price > 0 && item.price === 0) {
          item.price = enrichedItem.price;
        }
      });
      cart
        .save()
        .catch((err) => console.error("Error updating cart prices:", err));
    }

    // Add enriched items and calculated totals
    localizedCart.items = enrichedItems;
    localizedCart.totalPrice = grandTotal;
    localizedCart.totalItems = cart.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    return localizedCart;
  });

  return {
    carts: cartsWithTotals,
    summary: {
      totalCarts: carts.length,
      totalActiveCarts: carts.filter((cart) => cart.items.length > 0).length,
      totalItems: carts.reduce(
        (sum, cart) =>
          sum +
          cart.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      ),
    },
  };
};

// Another example: Get carts by user
export const getCartsByUser = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    return next(new AppError("Not authorized to access this resource", 403));
  }

  const { userId } = req.params;

  try {
    // Get all carts data first
    const allCartsData = await getAllCartsData(req);

    // Filter carts by specific user
    const userCarts = allCartsData.carts.filter(
      (cart) => cart.user._id === userId || cart.user._id.toString() === userId
    );

    // Calculate user-specific statistics
    const userTotalValue = userCarts.reduce(
      (sum, cart) => sum + cart.totalPrice,
      0
    );
    const userTotalItems = userCarts.reduce(
      (sum, cart) => sum + cart.totalItems,
      0
    );

    res.status(200).json({
      status: "success",
      data: {
        user: userCarts[0]?.user || null,
        carts: userCarts,
        statistics: {
          totalCarts: userCarts.length,
          totalValue: userTotalValue,
          totalItems: userTotalItems,
          averageCartValue:
            userCarts.length > 0 ? userTotalValue / userCarts.length : 0,
        },
      },
    });
  } catch {
    return next(new AppError("Error fetching user carts", 500));
  }
});

// Example of using getAllCartsData in another controller function
export const getCartsSummary = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    return next(new AppError("Not authorized to access this resource", 403));
  }

  try {
    // Use the helper function to get all carts data
    const cartsData = await getAllCartsData(req);

    // Calculate additional summary statistics
    const totalValue = cartsData.carts.reduce(
      (sum, cart) => sum + cart.totalPrice,
      0
    );
    const averageCartValue =
      cartsData.carts.length > 0 ? totalValue / cartsData.carts.length : 0;

    res.status(200).json({
      status: "success",
      data: {
        summary: {
          ...cartsData.summary,
          totalValue,
          averageCartValue,
          totalCarts: cartsData.carts.length,
        },
        recentCarts: cartsData.carts.slice(0, 5), // Get only first 5 carts
        topCarts: cartsData.carts
          .sort((a, b) => b.totalPrice - a.totalPrice)
          .slice(0, 3), // Get top 3 carts by value
      },
    });
  } catch {
    return next(new AppError("Error fetching carts summary", 500));
  }
});

export const getAllCarts = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    return next(new AppError("Not authorized to access this resource", 403));
  }

  const carts = await Cart.find()
    .populate("user", "firstName lastName email")
    .populate("items.product", "name")
    .sort({ createdAt: -1 });

  // Calculate totals for each cart with localization and enriched items
  const cartsWithTotals = carts.map((cart) => {
    const localizedCart = getLocalizedResponse(req, cart);

    // Enrich items with variant information and calculate totals
    const enrichedItems = [];
    let grandTotal = 0;
    let needsUpdate = false;

    for (const item of cart.items) {
      const product = item.product;

      // Find variant option by SKU for additional info
      let matchedOption = null;
      let matchedVariant = null;

      // Search through all variants and options
      for (const variant of product?.variants || []) {
        matchedOption = variant.options?.find((opt) => opt.sku === item.sku);
        if (matchedOption) {
          matchedVariant = variant;
          break;
        }
      }

      // Use the price stored in cart item, fallback to variant price if needed
      let price = item.price || 0;

      // If item price is 0 or missing, try to get it from variant
      if (price === 0 && matchedOption) {
        price = matchedOption.priceAfterDiscount || matchedOption.price || 0;
        // Mark that we need to update this cart item
        if (price > 0) {
          needsUpdate = true;
        }
      }

      const totalPrice = price * item.quantity;
      grandTotal += totalPrice;

      // Get all variant images for this option
      const variantImages = matchedOption?.variantImages || [];

      // Get product images as fallback
      const productImages = product.images || [];

      enrichedItems.push({
        _id: item._id,
        productId: product._id,
        sku: item.sku,
        quantity: item.quantity,
        notes: item.notes,
        productName: product.name,
        // Return all variant images if available, otherwise product images
        images: variantImages.length > 0 ? variantImages : productImages,
        price,
        totalPrice,
        variant: {
          label: matchedOption?.value,
          color: matchedOption?.colorName,
          colorHex: matchedOption?.colorHex,
          storage: matchedOption?.storage,
          ram: matchedOption?.ram,
          stock: matchedOption?.stock,
          // Include the parent variant name
          type: matchedVariant?.name,
        },
      });
    }

    // Update cart items with correct prices if needed
    if (needsUpdate) {
      cart.items.forEach((item, index) => {
        const enrichedItem = enrichedItems[index];
        if (enrichedItem && enrichedItem.price > 0 && item.price === 0) {
          item.price = enrichedItem.price;
        }
      });
      cart
        .save()
        .catch((err) => console.error("Error updating cart prices:", err));
    }

    // Add enriched items and calculated totals
    localizedCart.items = enrichedItems;
    localizedCart.totalPrice = grandTotal;
    localizedCart.totalItems = cart.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    return localizedCart;
  });

  res.status(200).json({
    status: "success",
    results: carts.length,
    data: {
      carts: cartsWithTotals,
      summary: {
        totalCarts: carts.length,
        totalActiveCarts: carts.filter((cart) => cart.items.length > 0).length,
        totalItems: carts.reduce(
          (sum, cart) =>
            sum +
            cart.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0
        ),
      },
    },
  });
});

// Get cart analytics and statistics (admin only)
export const getCartAnalytics = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    return next(new AppError("Not authorized to access this resource", 403));
  }

  const { startDate, endDate } = req.query;

  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  const carts = await Cart.find(dateFilter)
    .populate("user", "firstName lastName email")
    .populate("items.product", "name")
    .sort({ createdAt: -1 });

  // Calculate analytics
  const analytics = {
    totalCarts: carts.length,
    activeCarts: carts.filter((cart) => cart.status === "active").length,
    abandonedCarts: carts.filter((cart) => cart.status === "abandoned").length,
    convertedCarts: carts.filter((cart) => cart.status === "converted").length,
    totalItems: carts.reduce(
      (sum, cart) =>
        sum + cart.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    ),
    totalValue: carts.reduce((sum, cart) => sum + (cart.totalPrice || 0), 0),
    averageCartValue:
      carts.length > 0
        ? carts.reduce((sum, cart) => sum + (cart.totalPrice || 0), 0) /
          carts.length
        : 0,
    topProducts: {},
    userActivity: {},
  };

  // Calculate top products
  carts.forEach((cart) => {
    cart.items.forEach((item) => {
      const productName =
        item.product?.name?.en || item.product?.name || "Unknown Product";
      if (!analytics.topProducts[productName]) {
        analytics.topProducts[productName] = { quantity: 0, revenue: 0 };
      }
      analytics.topProducts[productName].quantity += item.quantity;
      analytics.topProducts[productName].revenue +=
        (item.price || 0) * item.quantity;
    });
  });

  // Calculate user activity
  carts.forEach((cart) => {
    const userName =
      `${cart.user?.firstName || ""} ${cart.user?.lastName || ""}`.trim() ||
      "Unknown User";
    if (!analytics.userActivity[userName]) {
      analytics.userActivity[userName] = { carts: 0, totalValue: 0 };
    }
    analytics.userActivity[userName].carts += 1;
    analytics.userActivity[userName].totalValue += cart.totalPrice || 0;
  });

  res.status(200).json({
    status: "success",
    data: {
      analytics,
      dateRange: { startDate, endDate },
      totalCarts: carts.length,
    },
  });
});

// Fix all existing carts by updating missing prices
export const fixCartPrices = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    return next(new AppError("Not authorized to access this resource", 403));
  }

  const carts = await Cart.find()
    .populate("items.product", "name images variants")
    .sort({ createdAt: -1 });

  let updatedCarts = 0;
  let updatedItems = 0;

  for (const cart of carts) {
    let cartNeedsUpdate = false;

    for (const item of cart.items) {
      const product = item.product;

      // Find variant option by SKU
      let matchedOption = null;
      for (const variant of product?.variants || []) {
        matchedOption = variant.options?.find((opt) => opt.sku === item.sku);
        if (matchedOption) break;
      }

      // If item price is 0 or missing, try to get it from variant
      if ((item.price === 0 || !item.price) && matchedOption) {
        const newPrice =
          matchedOption.priceAfterDiscount || matchedOption.price || 0;
        if (newPrice > 0) {
          item.price = newPrice;
          cartNeedsUpdate = true;
          updatedItems++;
        }
      }
    }

    if (cartNeedsUpdate) {
      await cart.save();
      updatedCarts++;
    }
  }

  res.status(200).json({
    status: "success",
    message: `Updated ${updatedItems} items in ${updatedCarts} carts`,
    data: {
      updatedCarts,
      updatedItems,
    },
  });
});

// Delete a cart by ID (admin only)
export const deleteCartById = asyncHandler(async (req, res, next) => {
  const { cartId } = req.params;
  const cart = await Cart.findByIdAndDelete(cartId);
  if (!cart) {
    return next(new AppError("Cart not found", 404));
  }
  res.status(204).json({ status: "success", data: null });
});

// Update a cart by ID (admin only)
export const updateCartById = asyncHandler(async (req, res, next) => {
  const { cartId } = req.params;
  const updatedCart = await Cart.findByIdAndUpdate(cartId, req.body, {
    new: true,
  });
  if (!updatedCart) {
    return next(new AppError("Cart not found", 404));
  }
  res.status(200).json({ status: "success", data: updatedCart });
});
