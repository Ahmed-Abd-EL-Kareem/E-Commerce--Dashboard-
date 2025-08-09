import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        sku: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],

    totalOrderPrice: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      address: {
        en: { type: String, required: true },
        ar: { type: String, required: true },
      },
      city: {
        en: { type: String, required: true },
        ar: { type: String, required: true },
      },
      postalCode: { type: String, required: true },
      country: {
        en: { type: String, required: true },
        ar: { type: String, required: true },
      },
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    statusDisplay: {
      en: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      },
      ar: {
        type: String,
        enum: [
          "قيد الانتظار",
          "قيد المعالجة",
          "تم الشحن",
          "تم التسليم",
          "ملغي",
        ],
      },
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash", "credit_card", "bank_transfer"],
      default: "cash",
    },
    paymentMethodDisplay: {
      en: {
        type: String,
        enum: ["Cash", "Credit Card", "Bank Transfer"],
      },
      ar: {
        type: String,
        enum: ["نقدي", "بطاقة ائتمان", "تحويل بنكي"],
      },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentStatusDisplay: {
      en: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
      },
      ar: {
        type: String,
        enum: ["قيد الانتظار", "مدفوع", "فشل"],
      },
    },
    notes: {
      en: { type: String },
      ar: { type: String },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to automatically set display values based on status
orderSchema.pre("save", function (next) {
  const statusMap = {
    pending: { en: "Pending", ar: "قيد الانتظار" },
    processing: { en: "Processing", ar: "قيد المعالجة" },
    shipped: { en: "Shipped", ar: "تم الشحن" },
    delivered: { en: "Delivered", ar: "تم التسليم" },
    cancelled: { en: "Cancelled", ar: "ملغي" },
  };

  const paymentMethodMap = {
    cash: { en: "Cash", ar: "نقدي" },
    credit_card: { en: "Credit Card", ar: "بطاقة ائتمان" },
    bank_transfer: { en: "Bank Transfer", ar: "تحويل بنكي" },
  };

  const paymentStatusMap = {
    pending: { en: "Pending", ar: "قيد الانتظار" },
    paid: { en: "Paid", ar: "مدفوع" },
    failed: { en: "Failed", ar: "فشل" },
  };

  if (this.status && statusMap[this.status]) {
    this.statusDisplay = statusMap[this.status];
  }

  if (this.paymentMethod && paymentMethodMap[this.paymentMethod]) {
    this.paymentMethodDisplay = paymentMethodMap[this.paymentMethod];
  }

  if (this.paymentStatus && paymentStatusMap[this.paymentStatus]) {
    this.paymentStatusDisplay = paymentStatusMap[this.paymentStatus];
  }

  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
