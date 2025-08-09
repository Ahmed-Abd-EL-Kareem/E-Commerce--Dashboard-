import asyncHandler from "express-async-handler";
import Order from "./orderModel.js";
import Cart from "../../modules/cart/cartModel.js";
import productModel from "../../modules/product/productModel.js";
import { AppError } from "../../utils/appError.js";
const validStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];

const getUserByOrder = (order) => {
  if (!order || !order.user) return null;
  return {
    id: order.user._id,
    firstName: order.user.firstName,
    lastName: order.user.lastName,
    email: order.user.email,
    phoneNumber: order.user.phoneNumber,
    profilePicture: order.user.profilePicture,
  };
};

// Helper function to get localized response based on Accept-Language header
const getLocalizedResponse = (req, order) => {
  const lang = req.headers["accept-language"]?.startsWith("ar") ? "ar" : "en";
  const orderObj = order.toObject();

  // Add localized display fields
  if (order.statusDisplay) {
    orderObj.statusText = order.statusDisplay[lang];
  }
  if (order.paymentMethodDisplay) {
    orderObj.paymentMethodText = order.paymentMethodDisplay[lang];
  }
  if (order.paymentStatusDisplay) {
    orderObj.paymentStatusText = order.paymentStatusDisplay[lang];
  }

  return orderObj;
};
export const createOrder = asyncHandler(async (req, res, next) => {
  // Check if the user is authenticated
  if (!req.user) {
    return next(new AppError("You are not authenticated", 401));
  }

  const userId = req.user._id;

  // Fetch the user's cart and populate with product details including SKU
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name price variants images", // Ensure variants are selected for SKU
  });

  if (!cart || cart.items.length === 0) {
    return next(new AppError("Your cart is empty", 400));
  }

  // Validate the shipping address
  const { shippingAddress, paymentMethod, notes } = req.body;
  if (
    !shippingAddress ||
    !shippingAddress.address?.en ||
    !shippingAddress.city?.en ||
    !shippingAddress.country?.en ||
    !shippingAddress.postalCode
  ) {
    return next(
      new AppError("Complete bilingual shipping address is required", 400)
    );
  }

  // Construct order items with price calculation and SKU
  const items = cart.items.map((item) => {
    const product = item.product;
    const sku = item.sku; // SKU is from the cart item

    // Find the matched variant by SKU
    let matchedOption = null;
    for (const variant of product.variants || []) {
      matchedOption = variant.options?.find((opt) => opt.sku === sku);
      if (matchedOption) break;
    }

    if (!matchedOption) {
      throw new AppError(
        `Invalid SKU (${sku}) for product ${product.name}`,
        400
      );
    }

    const price = matchedOption.priceAfterDiscount || matchedOption.price;

    return {
      product: product._id,
      sku: sku, // Include SKU in the order items
      quantity: item.quantity,
      price,
    };
  });

  // Calculate the total price of the order
  const totalOrderPrice = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  // Prepare order data
  const orderData = {
    user: userId,
    items, // all cart items with SKU
    shippingAddress,
    paymentMethod,
    totalOrderPrice,
  };

  // Add optional notes if provided
  if (notes) orderData.notes = notes;

  // Create the order
  const order = await Order.create(orderData);

  // Optionally clear the cart after order creation
  await cart.clearCart();

  // Populate order with product details for response, including SKU
  await order.populate("items.product", "name price image");

  // Send response with order details, including SKU
  res.status(201).json({
    status: "success",
    data: { order },
  });
});

// export const createOrder = asyncHandler(async (req, res, next) => {
//   const { items, shippingAddress, paymentMethod, notes } = req.body;

//   if (!items || items.length === 0) {
//     return next(new AppError("No order items", 400));
//   }

//   // Validate bilingual shipping address
//   if (!shippingAddress) {
//     return next(new AppError("Shipping address is required", 400));
//   }

//   const { address, city, country, postalCode } = shippingAddress;

//   // Validate that both English and Arabic addresses are provided
//   if (!address?.en || !address?.ar) {
//     return next(new AppError("Address must be provided in both English and Arabic", 400));
//   }
//   if (!city?.en || !city?.ar) {
//     return next(new AppError("City must be provided in both English and Arabic", 400));
//   }
//   if (!country?.en || !country?.ar) {
//     return next(new AppError("Country must be provided in both English and Arabic", 400));
//   }
//   if (!postalCode) {
//     return next(new AppError("Postal code is required", 400));
//   }

//   // Calculate total price from items
//   const totalOrderPrice = items.reduce((total, item) => {
//     return total + (item.price * item.quantity);
//   }, 0);

//   const orderData = {
//     user: req.user._id,
//     items,
//     shippingAddress,
//     paymentMethod,
//     totalOrderPrice,
//   };

//   // Add notes if provided
//   if (notes) {
//     orderData.notes = notes;
//   }

//   const order = await Order.create(orderData);

//   await order.populate("user", "firstName lastName email phoneNumber profilePicture");
//   await order.populate("items.product", "name price image description brand category");

//   const orderObject = getLocalizedResponse(req, order);
//   orderObject.customer = getUserByOrder(order);
//   delete orderObject.user;

//   res.status(201).json({ status: "success", data: { order: orderObject } });
// });

export const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("user", "firstName lastName email phoneNumber profilePicture")
    .populate("items.product", "name price images description brand category")
    .sort({ createdAt: -1 });

  const ordersWithCustomers = orders.map((order) => {
    const obj = getLocalizedResponse(req, order);
    obj.customer = getUserByOrder(order);
    delete obj.user;
    return obj;
  });

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: { orders: ordersWithCustomers },
  });
});

export const getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "firstName lastName email phoneNumber profilePicture")
    .populate("items.product", "name price image description brand category");

  if (!order) return next(new AppError("Order not found", 404));

  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(new AppError("Not authorized to access this order", 403));
  }

  const orderObject = getLocalizedResponse(req, order);
  orderObject.customer = getUserByOrder(order);
  delete orderObject.user;

  res.status(200).json({ status: "success", data: { order: orderObject } });
});

export const updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "firstName lastName email phoneNumber profilePicture")
    .populate(
      "cartItems.product",
      "name price image description brand category"
    );

  if (!order) return next(new AppError("Order not found", 404));

  order.isPaid = true;
  order.paymentStatus = "paid";
  order.status = "processing";
  await order.save();

  const orderObject = getLocalizedResponse(req, order);
  orderObject.customer = getUserByOrder(order);
  delete orderObject.user;

  res.status(200).json({ status: "success", data: { order: orderObject } });
});

export const updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "firstName lastName email phoneNumber profilePicture")
    .populate(
      "cartItems.product",
      "name price image description brand category"
    );

  if (!order) return next(new AppError("Order not found", 404));

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.status = "delivered";
  await order.save();

  const orderObject = getLocalizedResponse(req, order);
  orderObject.customer = getUserByOrder(order);
  delete orderObject.user;

  res.status(200).json({ status: "success", data: { order: orderObject } });
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate("user", "firstName lastName email phoneNumber profilePicture")
    .populate("items.product", "name price");

  const localizedOrders = orders.map((order) =>
    getLocalizedResponse(req, order)
  );

  res.status(200).json({
    status: "success",
    data: {
      orders: localizedOrders,
    },
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.status = status;
  const updatedOrder = await order.save();

  const localizedOrder = getLocalizedResponse(req, updatedOrder);

  res.json({
    status: "success",
    data: {
      order: localizedOrder,
    },
  });
});

export const markOrderAsPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "firstName lastName email phoneNumber profilePicture")
    .populate(
      "cartItems.product",
      "name price image description brand category"
    );

  if (!order) return next(new AppError("Order not found", 404));

  order.isPaid = true;
  order.paidAt = new Date();
  order.paymentStatus = "paid";
  await order.save();

  const orderObject = getLocalizedResponse(req, order);
  orderObject.customer = getUserByOrder(order);
  delete orderObject.user;

  res.status(200).json({ status: "success", data: { order: orderObject } });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to cancel this order");
  }

  if (order.status !== "pending") {
    res.status(400);
    throw new Error("Can only cancel pending orders");
  }

  order.status = "cancelled";
  await order.save();

  res.json({
    status: "success",
    message: "Order cancelled successfully",
  });
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  await order.deleteOne();
  res.json({
    status: "success",
    message: "Order deleted successfully",
  });
});

export const getOrdersByUserId = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;

  const orders = await Order.find({ user: userId })
    .populate("user", "firstName lastName email phoneNumber profilePicture")
    .populate(
      "cartItems.product",
      "name price image description brand category"
    )
    .sort({ createdAt: -1 });

  const ordersWithCustomers = orders.map((order) => {
    const obj = order.toObject();
    obj.customer = getUserByOrder(order);
    obj.totalItems = order.cartItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
    delete obj.user;
    return obj;
  });

  res.status(200).json({
    status: "success",
    results: orders.length,
    data: {
      orders: ordersWithCustomers,
      summary: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce(
          (sum, order) => sum + order.totalOrderPrice,
          0
        ),
      },
    },
  });
});

export const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  const { paymentStatus } = req.body;

  if (!validPaymentStatuses.includes(paymentStatus)) {
    return next(new AppError("Invalid payment status", 400));
  }

  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("items.product", "name price");

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  order.paymentStatus = paymentStatus;

  // If payment is successful, update order status to processing
  if (paymentStatus === "paid") {
    order.status = "processing";
    order.isPaid = true;
    order.paidAt = Date.now();
  }

  const updatedOrder = await order.save();

  res.status(200).json({
    status: "success",
    data: {
      order: updatedOrder,
    },
  });
});

// Add new endpoint to update order notes
export const updateOrderNotes = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Check authorization
  if (
    order.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(new AppError("Not authorized to update this order", 403));
  }

  order.notes = notes;
  const updatedOrder = await order.save();

  const localizedOrder = getLocalizedResponse(req, updatedOrder);

  res.json({
    status: "success",
    data: {
      order: localizedOrder,
    },
  });
});
