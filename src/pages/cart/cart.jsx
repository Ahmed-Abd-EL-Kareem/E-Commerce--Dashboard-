import React, { useState, useMemo } from "react";
import { FiTrash2, FiPlus, FiMinus, FiEye, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";

const CartPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminMinPrice, setAdminMinPrice] = useState("");
  const [adminMaxPrice, setAdminMaxPrice] = useState("");
  const [editingCart, setEditingCart] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Function to safely format currency
  const formatCurrency = (amount) => {
    const num = Number(amount);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  // Enhanced localization function to handle backend data structure
  const getLocalizedText = (text, lang = "ar", fallback = "N/A") => {
    if (!text) return fallback;
    if (typeof text === "string") return text;
    if (typeof text === "object" && (text.en || text.ar)) {
      return text[lang] || text.en || text.ar || fallback;
    }
    return fallback;
  };

  // Get current language from translation hook
  const { currentLanguage } = useTranslation();

  // Helper function to get localized text with current language
  const getLocalizedTextWithCurrentLang = (text, fallback = "N/A") => {
    return getLocalizedText(text, currentLanguage, fallback);
  };

  // Fetch all carts for admin, or just the user's cart for normal users
  const fetchCarts = async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    if (user && user.role === "admin") {
      const response = await axios.get(`${base_url}/api/cart/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { isAdmin: true, carts: response.data.data.carts };
    } else {
      const response = await axios.get(`${base_url}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { isAdmin: false, cart: response.data.data };
    }
  };

  const {
    data: cartData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["cart", user?.role],
    queryFn: fetchCarts,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user,
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await axios.patch(
          `${base_url}/api/cart/items/${productId}`,
          { quantity },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        return response.data;
      } catch (error) {
        console.error("Error updating cart item:", error);
        throw new Error(
          error.response?.data?.message || "Failed to update cart item"
        );
      }
    },
    onSuccess: () => {
      toast.success(t("cart.itemUpdated"));
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (error) => {
      toast.error(error.message || t("cart.failedToUpdateCart"));
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (productId) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await axios.delete(
          `${base_url}/api/cart/items/${productId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        console.error("Error removing cart item:", error);
        throw new Error(
          error.response?.data?.message || "Failed to remove item from cart"
        );
      }
    },
    onSuccess: () => {
      toast.success(t("cart.itemRemoved"));
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (error) => {
      toast.error(error.message || t("cart.failedToRemoveItem"));
    },
  });

  const handleQuantityChange = (productId, change) => {
    const item = cartData.items.find((i) => i.productId === productId);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + change);
    setUpdatingItemId(productId);
    updateQuantityMutation.mutate(
      { productId, quantity: newQuantity },
      {
        onSettled: () => setUpdatingItemId(null),
      }
    );
  };

  const handleRemoveItem = (productId) => {
    removeItemMutation.mutate(productId);
  };

  // Optimize filtering with useMemo
  const filteredItems = useMemo(() => {
    if (!cartData?.items) return [];

    return cartData.items.filter((item) => {
      const matchesSearch =
        getLocalizedTextWithCurrentLang(item.productName)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        getLocalizedTextWithCurrentLang(item.variant?.label)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [cartData?.items, searchTerm, currentLanguage]);

  // Memoized filtered admin carts
  const filteredAdminCarts = useMemo(() => {
    if (!cartData?.isAdmin || !cartData.carts) return [];
    return cartData.carts.filter((cart) => {
      const name = `${cart.user?.firstName || ""} ${
        cart.user?.lastName || ""
      }`.toLowerCase();
      const searchMatch = name.includes(adminSearch.toLowerCase());
      const total = cart.totalPriceAfterDiscount || cart.totalPrice || 0;
      const minOk = adminMinPrice === "" || total >= Number(adminMinPrice);
      const maxOk = adminMaxPrice === "" || total <= Number(adminMaxPrice);
      return searchMatch && minOk && maxOk;
    });
  }, [cartData, adminSearch, adminMinPrice, adminMaxPrice]);

  const deleteCartMutation = useMutation({
    mutationFn: async (cartId) => {
      const token = localStorage.getItem("token");
      await axios.delete(`${base_url}/api/cart/admin/${cartId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      toast.success(t("cart.cartDeleted"));
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || t("cart.failedToDeleteCart"));
    },
  });

  const handleDeleteCart = (cartId) => {
    if (window.confirm(t("cart.deleteConfirm"))) {
      deleteCartMutation.mutate(cartId);
    }
  };

  const updateCartMutation = useMutation({
    mutationFn: async ({ cartId, data }) => {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      console.log("Updating cart:", cartId, "with data:", data);

      const response = await axios.patch(
        `${base_url}/api/cart/admin/${cartId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Cart update response:", response.data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(t("cart.cartUpdated"));
      queryClient.invalidateQueries(["cart"]);
      setEditModalOpen(false);
      console.log("Cart update successful:", data);
    },
    onError: (err) => {
      const errorMessage =
        err.response?.data?.message || t("cart.failedToUpdateCart");
      console.error("Cart update error:", err.response?.data);
      toast.error(errorMessage);
    },
  });

  const handleUpdateCart = (cart) => {
    setEditingCart(cart);
    setEditModalOpen(true);
  };

  const handleSaveCart = (updatedCartData) => {
    try {
      // Validate required fields
      if (!editingCart?._id) {
        toast.error("Cart ID is missing");
        return;
      }

      // Ensure all required fields are present
      const validatedData = {
        ...updatedCartData,
        items: updatedCartData.items.map((item) => ({
          product: item.product,
          quantity: Math.max(1, item.quantity),
          price: item.price || 0,
          sku: item.sku || `SKU-${item.product}`,
          notes: item.notes || null,
        })),
      };

      console.log("Sending cart update data:", validatedData);

      updateCartMutation.mutate({
        cartId: editingCart._id,
        data: validatedData,
      });
    } catch (error) {
      console.error("Error preparing cart update:", error);
      toast.error("Failed to prepare cart update");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="text-gray-600 text-lg">{t("cart.loadingCart")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">
          {t("cart.errorLoadingCart")} {error?.message}
        </p>
        <button
          onClick={() => queryClient.invalidateQueries(["cart"])}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          {t("cart.retry")}
        </button>
      </div>
    );
  }

  if (cartData?.isAdmin) {
    // Admin view: all carts
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          {t("cart.adminTitle")}
        </h1>
        {/* Admin Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder={t("cart.searchCustomers")}
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/3"
          />
          <input
            type="number"
            placeholder={t("cart.minPrice")}
            value={adminMinPrice}
            onChange={(e) => setAdminMinPrice(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/6"
          />
          <input
            type="number"
            placeholder={t("cart.maxPrice")}
            value={adminMaxPrice}
            onChange={(e) => setAdminMaxPrice(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/6"
          />
          <div className="flex items-center text-gray-600 text-sm ml-auto">
            {t("cart.showingCarts")}{" "}
            <span className="font-semibold mx-1">
              {filteredAdminCarts.length}
            </span>{" "}
            {filteredAdminCarts.length === 1 ? t("cart.cart") : t("cart.carts")}
            {cartData?.summary && (
              <span className="ml-4">
                ({t("cart.totalItems")}: {cartData.summary.totalItems})
              </span>
            )}
          </div>
        </div>
        {filteredAdminCarts.length === 0 && <div>{t("cart.noCartsFound")}</div>}
        {filteredAdminCarts.map((cart) => (
          <div key={cart._id} className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="mb-2 flex justify-between items-center">
              <div>
                <span className="font-semibold">{t("cart.user")}</span>{" "}
                {cart.user?.firstName} {cart.user?.lastName} ({cart.user?.email}
                )
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateCart(cart)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {t("cart.update")}
                </button>
                <button
                  onClick={() => handleDeleteCart(cart._id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  {t("cart.delete")}
                </button>
              </div>
            </div>
            <div className="mb-2">
              <span className="font-semibold">{t("cart.status")}</span>{" "}
              {getLocalizedTextWithCurrentLang(cart.statusDisplay)}
            </div>
            {cart.notes && (
              <div className="mb-2">
                <span className="font-semibold">{t("cart.notes")}</span>{" "}
                {getLocalizedTextWithCurrentLang(cart.notes)}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      {t("cart.product")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      {t("cart.variant")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      {t("cart.sku")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      {t("cart.quantity")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      {t("cart.price")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      {t("cart.total")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cart.items.map((item, idx) => (
                    <tr key={item._id || idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {getLocalizedTextWithCurrentLang(item.productName)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {getLocalizedTextWithCurrentLang(item.variant?.label)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {item.sku || t("cart.notAvailable")}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        ${formatCurrency(item.price)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        ${formatCurrency(item.totalPrice)}
                      </td>
                      {item.totalBasePrice &&
                        item.totalBasePrice !== item.totalPrice && (
                          <td className="px-4 py-2 text-sm text-gray-500 line-through">
                            ${formatCurrency(item.totalBasePrice)}
                          </td>
                        )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end space-x-8">
              <div>
                <span className="font-semibold">
                  {t("cart.totalBeforeDiscount")}
                </span>{" "}
                ${formatCurrency(cart.totalPriceBeforeDiscount)}
              </div>
              <div>
                <span className="font-semibold">{t("cart.discount")}</span>{" "}
                {cart.calculatedDiscountPercent || 0}%
              </div>
              <div>
                <span className="font-semibold">
                  {t("cart.totalAfterDiscount")}
                </span>{" "}
                ${formatCurrency(cart.totalPriceAfterDiscount)}
              </div>
            </div>
          </div>
        ))}
        {editModalOpen && editingCart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">{t("cart.editCart")}</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {t("cart.editCartSubtitle")}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="text-white hover:text-blue-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Discount Section */}
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      {t("cart.discountSettings")}
                    </h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("cart.discountPercentage")}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingCart.discount || 0}
                            onChange={(e) =>
                              setEditingCart({
                                ...editingCart,
                                discount: Number(e.target.value),
                              })
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="0"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {editingCart.discount || 0}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {t("cart.currentDiscount")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    {t("cart.cartItems")}
                  </h3>

                  {editingCart.items.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-gray-400 mb-4">
                        <svg
                          className="w-16 h-16 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">
                        {t("cart.emptyCart")}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {t("cart.emptyCartMessage")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editingCart.items.map((item, idx) => (
                        <div
                          key={item._id || idx}
                          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start space-x-4">
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              <img
                                src={
                                  item.images?.[0]?.url ||
                                  "https://via.placeholder.com/80"
                                }
                                alt={
                                  getLocalizedTextWithCurrentLang(
                                    item.images?.[0]?.altText
                                  ) ||
                                  getLocalizedTextWithCurrentLang(
                                    item.productName
                                  )
                                }
                                className="w-16 h-16 rounded-lg object-cover border"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src =
                                    "https://via.placeholder.com/80";
                                }}
                              />
                            </div>

                            {/* Product Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                                    {getLocalizedTextWithCurrentLang(
                                      item.productName
                                    )}
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {t("cart.sku")}:{" "}
                                    {item.sku || t("cart.notAvailable")}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {getLocalizedTextWithCurrentLang(
                                      item.variant?.label
                                    )}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    const newItems = editingCart.items.filter(
                                      (_, i) => i !== idx
                                    );
                                    setEditingCart({
                                      ...editingCart,
                                      items: newItems,
                                    });
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                  title={t("cart.removeProduct")}
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Price and Quantity */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div>
                                    <span className="text-xs text-gray-500">
                                      {t("cart.priceLabel")}
                                    </span>
                                    <div className="font-semibold text-green-600">
                                      ${formatCurrency(item.price)}
                                    </div>
                                    {item.basePrice &&
                                      item.basePrice !== item.price && (
                                        <div className="text-xs text-gray-400 line-through">
                                          {t("cart.original")} $
                                          {formatCurrency(item.basePrice)}
                                        </div>
                                      )}
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">
                                      {t("cart.quantityLabel")}
                                    </span>
                                    <div className="flex items-center border border-gray-300 rounded-lg">
                                      <button
                                        onClick={() => {
                                          const newItems =
                                            editingCart.items.map((it, i) =>
                                              i === idx
                                                ? {
                                                    ...it,
                                                    quantity: Math.max(
                                                      1,
                                                      it.quantity - 1
                                                    ),
                                                  }
                                                : it
                                            );
                                          setEditingCart({
                                            ...editingCart,
                                            items: newItems,
                                          });
                                        }}
                                        className="px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                      >
                                        <FiMinus className="w-3 h-3" />
                                      </button>
                                      <input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const newItems =
                                            editingCart.items.map((it, i) =>
                                              i === idx
                                                ? {
                                                    ...it,
                                                    quantity: Math.max(
                                                      1,
                                                      Number(e.target.value)
                                                    ),
                                                  }
                                                : it
                                            );
                                          setEditingCart({
                                            ...editingCart,
                                            items: newItems,
                                          });
                                        }}
                                        className="w-16 text-center border-0 focus:ring-0 text-sm font-medium"
                                      />
                                      <button
                                        onClick={() => {
                                          const newItems =
                                            editingCart.items.map((it, i) =>
                                              i === idx
                                                ? {
                                                    ...it,
                                                    quantity: it.quantity + 1,
                                                  }
                                                : it
                                            );
                                          setEditingCart({
                                            ...editingCart,
                                            items: newItems,
                                          });
                                        }}
                                        className="px-3 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                      >
                                        <FiPlus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs text-gray-500">
                                    {t("cart.totalLabel")}
                                  </span>
                                  <div className="font-bold text-lg text-blue-600">
                                    $
                                    {formatCurrency(item.price * item.quantity)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary Section */}
                {editingCart.items.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      {t("cart.editSummary")}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">
                          {t("cart.totalProducts")}
                        </span>
                        <span className="font-semibold text-gray-800 ml-2">
                          {editingCart.items.reduce(
                            (sum, item) => sum + item.quantity,
                            0
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          {t("cart.subtotal")}
                        </span>
                        <span className="font-semibold text-gray-800 ml-2">
                          $
                          {formatCurrency(
                            editingCart.items.reduce(
                              (sum, item) => sum + item.price * item.quantity,
                              0
                            )
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          {t("cart.discount")}
                        </span>
                        <span className="font-semibold text-green-600 ml-2">
                          {editingCart.discount || 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          {t("cart.finalTotal")}
                        </span>
                        <span className="font-bold text-blue-600 ml-2">
                          $
                          {formatCurrency(
                            editingCart.items.reduce(
                              (sum, item) => sum + item.price * item.quantity,
                              0
                            ) *
                              (1 - (editingCart.discount || 0) / 100)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    {t("cart.cancel")}
                  </button>
                  <button
                    onClick={() =>
                      handleSaveCart({
                        discount: Number(editingCart.discount),
                        items: editingCart.items.map(
                          ({ productId, quantity, price, sku, basePrice }) => ({
                            product: productId,
                            quantity: Math.max(1, quantity),
                            price: price || basePrice || 0,
                            sku: sku || `SKU-${productId}`,
                            notes: null,
                          })
                        ),
                      })
                    }
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
                    disabled={updateCartMutation.isLoading}
                  >
                    {updateCartMutation.isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{t("cart.saving")}</span>
                      </div>
                    ) : (
                      t("cart.saveChanges")
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("cart.title")}
        </h1>
      </div>

      {/* Search */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t("cart.searchItems")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Cart Items */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("cart.product")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("cart.variant")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("cart.price")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("cart.quantity")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("cart.total")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("cart.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-16 w-16 flex-shrink-0">
                        <img
                          className="h-16 w-16 rounded-md object-cover"
                          src={
                            item.images?.[0]?.url ||
                            "https://via.placeholder.com/150"
                          }
                          alt={
                            getLocalizedTextWithCurrentLang(
                              item.images?.[0]?.altText
                            ) ||
                            getLocalizedTextWithCurrentLang(item.productName)
                          }
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/150";
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {getLocalizedTextWithCurrentLang(item.productName)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getLocalizedTextWithCurrentLang(item.variant?.label)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {getLocalizedTextWithCurrentLang(item.variant?.label)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getLocalizedTextWithCurrentLang(item.variant?.color)} -{" "}
                      {item.variant?.storage}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${formatCurrency(item.price)}
                    </div>
                    {item.basePrice && item.basePrice !== item.price && (
                      <div className="text-sm text-gray-500 line-through">
                        ${formatCurrency(item.basePrice)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantityChange(item.productId, -1)}
                        disabled={updatingItemId === item.productId}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        <FiMinus className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-900">
                        {updatingItemId === item.productId ? (
                          <span className="animate-pulse">
                            {t("cart.updating")}
                          </span>
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, 1)}
                        disabled={updatingItemId === item.productId}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        <FiPlus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${formatCurrency(item.totalPrice)}
                    </div>
                    {item.totalBasePrice &&
                      item.totalBasePrice !== item.totalPrice && (
                        <div className="text-sm text-gray-500 line-through">
                          ${formatCurrency(item.totalBasePrice)}
                        </div>
                      )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setIsModalOpen(true);
                      }}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      <FiEye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.productId)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            {t("cart.orderSummary")}
          </h3>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-base text-gray-600">
              <p>{t("cart.subtotalLabel")}</p>
              <p>${formatCurrency(cartData.totalPriceBeforeDiscount)}</p>
            </div>
            {cartData.calculatedDiscountPercent > 0 && (
              <div className="flex justify-between text-base text-gray-600">
                <p>
                  {t("cart.discountLabel")} (
                  {cartData.calculatedDiscountPercent}%)
                </p>
                <p>
                  -$
                  {formatCurrency(
                    cartData.totalPriceBeforeDiscount *
                      (cartData.calculatedDiscountPercent / 100)
                  )}
                </p>
              </div>
            )}
            <div className="flex justify-between text-base text-gray-600">
              <p>{t("cart.tax")}</p>
              <p>${formatCurrency(cartData.totalPriceAfterDiscount * 0.1)}</p>
            </div>
            <div className="flex justify-between text-base font-medium text-gray-900">
              <p>{t("cart.total")}</p>
              <p>${formatCurrency(cartData.totalPriceAfterDiscount * 1.1)}</p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                className="w-full bg-primary-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {t("cart.proceedToCheckout")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Item Details Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {getLocalizedTextWithCurrentLang(selectedItem.productName)}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t("cart.productDetails")}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <img
                  src={
                    selectedItem.images?.[0]?.url ||
                    "https://via.placeholder.com/150"
                  }
                  alt={
                    getLocalizedTextWithCurrentLang(
                      selectedItem.images?.[0]?.altText
                    ) ||
                    getLocalizedTextWithCurrentLang(selectedItem.productName)
                  }
                  className="h-32 w-32 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/150";
                  }}
                />
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t("cart.variant")}:{" "}
                        {getLocalizedTextWithCurrentLang(
                          selectedItem.variant?.label
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t("cart.color")}{" "}
                        {getLocalizedTextWithCurrentLang(
                          selectedItem.variant?.color
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t("cart.storage")} {selectedItem.variant?.storage}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t("cart.ram")} {selectedItem.variant?.ram}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t("cart.sku")}:{" "}
                        {selectedItem.sku || t("cart.notAvailable")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t("cart.price")}: ${formatCurrency(selectedItem.price)}
                      </p>
                      {selectedItem.basePrice &&
                        selectedItem.basePrice !== selectedItem.price && (
                          <p className="text-sm text-gray-500 line-through">
                            {t("cart.original")}: $
                            {formatCurrency(selectedItem.basePrice)}
                          </p>
                        )}
                      <p className="text-sm text-gray-500">
                        {t("cart.quantity")}: {selectedItem.quantity}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t("cart.total")}: $
                        {formatCurrency(selectedItem.totalPrice)}
                      </p>
                      {selectedItem.totalBasePrice &&
                        selectedItem.totalBasePrice !==
                          selectedItem.totalPrice && (
                          <p className="text-sm text-gray-500 line-through">
                            {t("cart.originalTotal")}: $
                            {formatCurrency(selectedItem.totalBasePrice)}
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
