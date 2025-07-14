import React, { useState, useMemo } from "react";
import { FiTrash2, FiPlus, FiMinus, FiEye, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const CartPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
        throw new Error(error.response?.data?.message || "Failed to update cart item");
      }
    },
    onSuccess: () => {
      toast.success("Cart updated successfully");
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update cart");
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

        const response = await axios.delete(`${base_url}/api/cart/items/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return response.data;
      } catch (error) {
        console.error("Error removing cart item:", error);
        throw new Error(error.response?.data?.message || "Failed to remove item from cart");
      }
    },
    onSuccess: () => {
      toast.success("Item removed from cart");
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove item");
    },
  });

  const handleQuantityChange = (productId, change) => {
    const item = cartData.items.find((i) => i.product._id === productId);
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
      const matchesSearch = item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.product?.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [cartData?.items, searchTerm]);

  // Memoized filtered admin carts
  const filteredAdminCarts = useMemo(() => {
    if (!cartData?.isAdmin || !cartData.carts) return [];
    return cartData.carts.filter(cart => {
      const name = `${cart.user?.firstName || ''} ${cart.user?.lastName || ''}`.toLowerCase();
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
      toast.success("Cart deleted successfully");
      queryClient.invalidateQueries(["cart"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete cart");
    },
  });

  const handleDeleteCart = (cartId) => {
    if (window.confirm("Are you sure you want to delete this cart?")) {
      deleteCartMutation.mutate(cartId);
    }
  };

  const updateCartMutation = useMutation({
    mutationFn: async ({ cartId, data }) => {
      const token = localStorage.getItem("token");
      return axios.patch(`${base_url}/api/cart/admin/${cartId}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      toast.success("Cart updated successfully");
      queryClient.invalidateQueries(["cart"]);
      setEditModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update cart");
    },
  });

  const handleUpdateCart = (cart) => {
    setEditingCart(cart);
    setEditModalOpen(true);
  };

  const handleSaveCart = (updatedCartData) => {
    updateCartMutation.mutate({ cartId: editingCart._id, data: updatedCartData });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="text-gray-600 text-lg">Loading cart(s)...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading cart(s): {error?.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries(["cart"])}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (cartData?.isAdmin) {
    // Admin view: all carts
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">All Carts (Admin View)</h1>
        {/* Admin Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by customer name..."
            value={adminSearch}
            onChange={e => setAdminSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/3"
          />
          <input
            type="number"
            placeholder="Min Price"
            value={adminMinPrice}
            onChange={e => setAdminMinPrice(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/6"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={adminMaxPrice}
            onChange={e => setAdminMaxPrice(e.target.value)}
            className="border px-3 py-2 rounded w-full md:w-1/6"
          />
          <div className="flex items-center text-gray-600 text-sm ml-auto">
            Showing <span className="font-semibold mx-1">{filteredAdminCarts.length}</span> cart{filteredAdminCarts.length !== 1 && 's'}
          </div>
        </div>
        {filteredAdminCarts.length === 0 && <div>No carts found.</div>}
        {filteredAdminCarts.map((cart) => (
          <div key={cart._id} className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="mb-2 flex justify-between items-center">
              <div>
                <span className="font-semibold">User:</span> {cart.user?.firstName} {cart.user?.lastName} ({cart.user?.email})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateCart(cart)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Update
                </button>
                <button
                  onClick={() => handleDeleteCart(cart._id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mb-2">
              <span className="font-semibold">Phone:</span> {cart.user?.phoneNumber || 'N/A'}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cart.items.map((item, idx) => (
                    <tr key={item._id || idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.product?.name || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">${formatCurrency(item.price)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">${formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end space-x-8">
              <div><span className="font-semibold">Total:</span> ${formatCurrency(cart.totalPrice)}</div>
              <div><span className="font-semibold">Discount:</span> {cart.discount || 0}%</div>
              <div><span className="font-semibold">Total After Discount:</span> ${formatCurrency(cart.totalPrice - (cart.totalPrice * (cart.discount || 0) / 100))}</div>
            </div>
          </div>
        ))}
        {editModalOpen && editingCart && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Edit Cart</h2>
              <label className="block mb-2 text-sm font-medium">Discount (%)</label>
              <input
                type="number"
                value={editingCart.discount}
                onChange={e => setEditingCart({ ...editingCart, discount: e.target.value })}
                className="border px-3 py-2 rounded w-full mb-4"
              />
              <div className="mb-4">
                <h3 className="font-medium mb-2">Items</h3>
                {editingCart.items.map((item, idx) => (
                  <div key={item._id || idx} className="flex items-center gap-2 mb-2">
                    <span className="flex-1">{item.product?.name || 'Product'}</span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => {
                        const newItems = editingCart.items.map((it, i) =>
                          i === idx ? { ...it, quantity: Number(e.target.value) } : it
                        );
                        setEditingCart({ ...editingCart, items: newItems });
                      }}
                      className="w-20 border px-2 py-1 rounded"
                    />
                    <button
                      onClick={() => {
                        const newItems = editingCart.items.filter((_, i) => i !== idx);
                        setEditingCart({ ...editingCart, items: newItems });
                      }}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {editingCart.items.length === 0 && (
                  <div className="text-gray-400 text-sm">No items in cart.</div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >Cancel</button>
                <button
                  onClick={() => handleSaveCart({
                    discount: Number(editingCart.discount),
                    items: editingCart.items.map(({ product, quantity, price }) => ({
                      product: product._id || product,
                      quantity,
                      price
                    }))
                  })}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={updateCartMutation.isLoading}
                >Save</button>
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
        <h1 className="text-2xl font-semibold text-gray-900">Shopping Cart</h1>
      </div>

      {/* Search */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search items..."
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
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.product._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-16 w-16 flex-shrink-0">
                        <img
                          className="h-16 w-16 rounded-md object-cover"
                          src={item.product?.image || "https://via.placeholder.com/150"}
                          alt={item.product?.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/150";
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.product?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.product?.description?.slice(0, 50)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${formatCurrency(item.price)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantityChange(item.product._id, -1)}
                        disabled={updatingItemId === item.product._id}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        <FiMinus className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-900">
                        {updatingItemId === item.product._id ? (
                          <span className="animate-pulse">Updating...</span>
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.product._id, 1)}
                        disabled={updatingItemId === item.product._id}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        <FiPlus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${formatCurrency(item.price * item.quantity)}
                    </div>
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
                      onClick={() => handleRemoveItem(item.product._id)}
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
            Order Summary
          </h3>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-base text-gray-600">
              <p>Subtotal</p>
              <p>${formatCurrency(cartData.totalPrice)}</p>
            </div>
            {cartData.discount > 0 && (
              <div className="flex justify-between text-base text-gray-600">
                <p>Discount ({cartData.discount}%)</p>
                <p>-${formatCurrency(cartData.totalPrice * (cartData.discount / 100))}</p>
              </div>
            )}
            <div className="flex justify-between text-base text-gray-600">
              <p>Tax (10%)</p>
              <p>${formatCurrency(cartData.totalPriceAfterDiscount * 0.1)}</p>
            </div>
            <div className="flex justify-between text-base font-medium text-gray-900">
              <p>Total</p>
              <p>${formatCurrency(cartData.totalPriceAfterDiscount * 1.1)}</p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                className="w-full bg-primary-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Proceed to Checkout
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
                  {selectedItem.product?.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Product Details
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
                  src={selectedItem.product?.image || "https://via.placeholder.com/150"}
                  alt={selectedItem.product?.name}
                  className="h-32 w-32 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/150";
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 mb-2">
                    {selectedItem.product?.description}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Price: ${formatCurrency(selectedItem.price)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Quantity: {selectedItem.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        Total: ${formatCurrency(selectedItem.price * selectedItem.quantity)}
                      </p>
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
