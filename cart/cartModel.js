// import mongoose from "mongoose";

// const cartItemSchema = new mongoose.Schema({
//   product: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Product",
//     required: true,
//   },
//   quantity: {
//     type: Number,
//     required: true,
//     min: 1,
//   },
//   price: {
//     type: Number,
//     required: true,
//   },
//   notes: {
//     en: { type: String },
//     ar: { type: String }
//   },
// });

// const cartSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     items: [cartItemSchema],
//     totalPrice: {
//       type: Number,
//       default: 0,
//     },
//     discount: {
//       type: Number,
//       default: 0,
//       min: [0, "Discount cannot be negative"],
//       max: [100, "Discount cannot be greater than 100"],
//     },
//     discountDescription: {
//       en: { type: String },
//       ar: { type: String }
//     },
//     notes: {
//       en: { type: String },
//       ar: { type: String }
//     },
//     status: {
//       type: String,
//       enum: ["active", "abandoned", "converted"],
//       default: "active",
//     },
//     statusDisplay: {
//       en: {
//         type: String,
//         enum: ["Active", "Abandoned", "Converted"],
//       },
//       ar: {
//         type: String,
//         enum: ["نشط", "مهجور", "تم التحويل"],
//       }
//     },
//   },
//   {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   }
// );

// // Calculate total price before saving
// cartSchema.pre("save", function (next) {
//   this.totalPrice = this.items.reduce((total, item) => {
//     return total + (item.price * item.quantity);
//   }, 0);

//   // Auto-populate status display based on status
//   const statusMap = {
//     active: { en: "Active", ar: "نشط" },
//     abandoned: { en: "Abandoned", ar: "مهجور" },
//     converted: { en: "Converted", ar: "تم التحويل" }
//   };

//   if (this.status && statusMap[this.status]) {
//     this.statusDisplay = statusMap[this.status];
//   }

//   next();
// });

// // Method to add item to cart
// cartSchema.methods.addItem = async function (productId, quantity, price, notes = null) {
//   const existingItem = this.items.find(
//     (item) => item.product.toString() === productId.toString()
//   );

//   if (existingItem) {
//     existingItem.quantity += quantity;
//     if (notes) {
//       existingItem.notes = notes;
//     }
//   } else {
//     const newItem = {
//       product: productId,
//       quantity,
//       price,
//     };
//     if (notes) {
//       newItem.notes = notes;
//     }
//     this.items.push(newItem);
//   }

//   return this.save();
// };

// // Method to remove item from cart
// cartSchema.methods.removeItem = async function (productId) {
//   this.items = this.items.filter(
//     (item) => item.product.toString() !== productId.toString()
//   );
//   return this.save();
// };

// // Method to update item quantity
// cartSchema.methods.updateItemQuantity = async function (productId, quantity) {
//   const item = this.items.find(
//     (item) => item.product.toString() === productId.toString()
//   );

//   if (item) {
//     item.quantity = quantity;
//     return this.save();
//   }
//   return this;
// };

// // Method to update item notes
// cartSchema.methods.updateItemNotes = async function (productId, notes) {
//   const item = this.items.find(
//     (item) => item.product.toString() === productId.toString()
//   );

//   if (item) {
//     item.notes = notes;
//     return this.save();
//   }
//   return this;
// };

// // Method to apply discount with description
// cartSchema.methods.applyDiscount = async function (discountPercent, description = null) {
//   this.discount = discountPercent;
//   if (description) {
//     this.discountDescription = description;
//   }
//   return this.save();
// };

// // Method to clear cart
// cartSchema.methods.clearCart = async function () {
//   this.items = [];
//   this.totalPrice = 0;
//   this.discount = 0;
//   this.discountDescription = undefined;
//   this.notes = undefined;
//   return this.save();
// };

// // Method to mark cart as abandoned
// cartSchema.methods.markAsAbandoned = async function () {
//   this.status = "abandoned";
//   return this.save();
// };

// // Method to mark cart as converted (when order is placed)
// cartSchema.methods.markAsConverted = async function () {
//   this.status = "converted";
//   return this.save();
// };

// cartSchema.virtual("totalPriceAfterDiscount").get(function () {
//   return this.totalPrice - (this.totalPrice * this.discount / 100);
// });

// // Virtual for getting localized discount description
// cartSchema.virtual("discountText").get(function () {
//   if (this.discount > 0) {
//     return {
//       en: `${this.discount}% discount applied${this.discountDescription?.en ? ': ' + this.discountDescription.en : ''}`,
//       ar: `تم تطبيق خصم ${this.discount}%${this.discountDescription?.ar ? ': ' + this.discountDescription.ar : ''}`
//     };
//   }
//   return {
//     en: "No discount applied",
//     ar: "لم يتم تطبيق أي خصم"
//   };
// });

// const Cart = mongoose.model("Cart", cartSchema);

// export default Cart;
// models/cartModel.js
import mongoose from "mongoose";
const cartItemSchema = new mongoose.Schema({
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
  notes: {
    en: { type: String },
    ar: { type: String },
  },
});

// const cartItemSchema = new mongoose.Schema({
//   product: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Product",
//     required: true,
//   },
//   sku: {
//     type: String,
//     required: true,
//   },
//   quantity: {
//     type: Number,
//     required: true,
//     min: 1,
//   },
//   price: {
//     type: Number,
//     required: true,
//   },
//   notes: {
//     en: { type: String },
//     ar: { type: String },
//   },
// });

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [cartItemSchema],
    totalPrice: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot be greater than 100"],
    },
    discountDescription: {
      en: { type: String },
      ar: { type: String },
    },
    notes: {
      en: { type: String },
      ar: { type: String },
    },
    status: {
      type: String,
      enum: ["active", "abandoned", "converted"],
      default: "active",
    },
    statusDisplay: {
      en: {
        type: String,
        enum: ["Active", "Abandoned", "Converted"],
      },
      ar: {
        type: String,
        enum: ["نشط", "مهجور", "تم التحويل"],
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-calculate total price & status label
// cartSchema.pre("save", function (next) {
//   // Remove any items without SKU before saving
//   this.items = this.items.filter((item) => item.sku && item.sku.trim() !== "");

//   this.totalPrice = this.items.reduce(
//     (total, item) => total + item.price * item.quantity,
//     0
//   );

//   const statusMap = {
//     active: { en: "Active", ar: "نشط" },
//     abandoned: { en: "Abandoned", ar: "مهجور" },
//     converted: { en: "Converted", ar: "تم التحويل" },
//   };

//   if (this.status && statusMap[this.status]) {
//     this.statusDisplay = statusMap[this.status];
//   }

//   next();
// });
cartSchema.pre("save", function (next) {
  this.items = this.items.filter((item) => item.sku && item.sku.trim() !== "");

  // Calculate total price from items
  this.totalPrice = this.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const statusMap = {
    active: { en: "Active", ar: "نشط" },
    abandoned: { en: "Abandoned", ar: "مهجور" },
    converted: { en: "Converted", ar: "تم التحويل" },
  };

  if (this.status && statusMap[this.status]) {
    this.statusDisplay = statusMap[this.status];
  }

  next();
});

// Methods
// cartSchema.methods.addItem = async function (
//   productId,
//   quantity,
//   price,
//   notes = null,
//   sku
// ) {
//   if (!sku) throw new Error("SKU is required");

//   const existingItem = this.items.find(
//     (item) =>
//       item.product.toString() === productId.toString() && item.sku === sku
//   );

//   if (existingItem) {
//     existingItem.quantity += quantity;
//     if (notes) existingItem.notes = notes;
//   } else {
//     this.items.push({ product: productId, quantity, price, sku, notes });
//   }

//   return this.save();
// };
// // Methods
// cartSchema.methods.addItem = async function (
//   productId,
//   quantity,
//   price,
//   notes = null,
//   sku
// ) {
//   if (!sku) throw new Error("SKU is required");
//   // console.log("Adding item to cart:", {
//   //   productId,
//   //   quantity,
//   //   price,
//   //   notes,
//   //   sku,
//   // });
//   const existingItem = this.items.find(
//     (item) =>
//       item.product.toString() === productId.toString() && item.sku === sku
//   );

//   if (existingItem) {
//     existingItem.quantity += quantity;
//     if (notes) existingItem.notes = notes;
//   } else {
//     this.items.push({ product: productId, quantity, price, sku, notes });
//   }
//   // console.log("Cart items after addition:", this.items);

//   return this.save();
// };
cartSchema.methods.addItem = async function (
  productId,
  quantity,
  price,
  notes = null,
  sku
) {
  if (!sku) throw new Error("SKU is required");

  const existingItem = this.items.find(
    (item) =>
      item.product.toString() === productId.toString() && item.sku === sku
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    if (notes) existingItem.notes = notes;
  } else {
    this.items.push({ product: productId, quantity, price, sku, notes });
  }

  return this.save();
};

cartSchema.methods.removeItem = async function (productId, sku) {
  this.items = this.items.filter(
    (item) =>
      item.product.toString() !== productId.toString() || item.sku !== sku
  );
  return this.save();
};

cartSchema.methods.updateItemQuantity = async function (
  productId,
  sku,
  quantity
) {
  const item = this.items.find(
    (item) =>
      item.product.toString() === productId.toString() && item.sku === sku
  );
  if (item) {
    item.quantity = quantity;
    return this.save();
  }
  return this;
};

cartSchema.methods.clearCart = async function () {
  this.items = [];
  this.totalPrice = 0;
  this.discount = 0;
  this.discountDescription = undefined;
  this.notes = undefined;
  return this.save();
};

cartSchema.virtual("totalPriceAfterDiscount").get(function () {
  return this.totalPrice - (this.totalPrice * this.discount) / 100;
});

cartSchema.virtual("discountText").get(function () {
  if (this.discount > 0) {
    return {
      en: `${this.discount}% discount applied${
        this.discountDescription?.en ? ": " + this.discountDescription.en : ""
      }`,
      ar: `تم تطبيق خصم ${this.discount}%${
        this.discountDescription?.ar ? ": " + this.discountDescription.ar : ""
      }`,
    };
  }
  return {
    en: "No discount applied",
    ar: "لم يتم تطبيق أي خصم",
  };
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
