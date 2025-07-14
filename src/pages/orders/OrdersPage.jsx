import React, { useState } from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Badge from "../../components/Badge";
import { FiEye, FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Input from "../../components/Input";
import axios from "axios";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const OrdersPage = () => {
  const { user: adminUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Fetch orders using React Query
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const response = await axios.get(`${base_url}/api/orders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return response.data.data.orders;
    },
  });

  // Mutation for updating order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      if (!adminUser || adminUser.role !== "admin") {
        throw new Error("Only administrators can update order status");
      }
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await axios.put(
          `${base_url}/api/orders/${orderId}/status`,
          { status },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error("Order status update error:", {
          error,
          response: error.response?.data,
          status: error.response?.status,
          url: `${base_url}/api/orders/${orderId}/status`,
        });

        if (error.response) {
          if (error.response.status === 404) {
            throw new Error(
              "Order not found. Please refresh the page and try again."
            );
          } else if (error.response.status === 401) {
            throw new Error("Your session has expired. Please log in again.");
          } else if (error.response.status === 403) {
            throw new Error(
              "You don't have permission to update order status."
            );
          } else {
            throw new Error(
              error.response.data.message ||
                `Failed to update order status: ${error.response.status}`
            );
          }
        } else if (error.request) {
          throw new Error(
            "No response from server. Please check your internet connection."
          );
        } else {
          throw new Error(
            error.message || "An error occurred while updating order status"
          );
        }
      }
    },
    onSuccess: () => {
      toast.success("Order status updated successfully");
      queryClient.invalidateQueries(["orders"]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update order status");
      if (
        error.message.includes("session has expired") ||
        error.message.includes("not authenticated")
      ) {
        navigate("/login");
      }
    },
    onSettled: () => setUpdatingOrderId(null),
  });

  const formatCurrency = (amount) => {
    const num = Number(amount);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const getOrderName = (order) => {
    const date = new Date(order.createdAt);
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `#${order._id.slice(-6)}`;
  };

  // Filtering logic
  const filteredOrders = orders.filter((order) => {
    const customer = order.user || {};
    const fullName = `${customer.firstName || ""} ${
      customer.lastName || ""
    }`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      (customer.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOrderName(order).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    const matchesPaymentStatus = paymentStatusFilter
      ? order.paymentStatus === paymentStatusFilter
      : true;
    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  const handleStatusChange = (orderId, newStatus) => {
    if (!adminUser) {
      toast.error("Please log in to update order status");
      navigate("/login");
      return;
    }
    if (adminUser.role !== "admin") {
      toast.error("Only administrators can update order status");
      return;
    }

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(newStatus)) {
      toast.error("Invalid order status");
      return;
    }

    setUpdatingOrderId(orderId);
    updateOrderStatusMutation.mutate({ orderId, status: newStatus });
  };

  const handleExport = (orderId) => {
    toast.info("Export functionality coming soon!");
  };

  // Table columns definition
  const columns = [
    {
      key: "order",
      title: "Order",
      render: (order) => getOrderName(order),
    },
    {
      key: "customer",
      title: "Customer",
      render: (order) => {
        const customer = order.user || {};
        return (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0">
              <img
                className="h-10 w-10 rounded-full object-cover"
                src={
                  customer.profilePicture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    `${customer.firstName || ""} ${customer.lastName || ""}`
                  )}`
                }
                alt={`${customer.firstName || ""} ${customer.lastName || ""}`}
              />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {customer.firstName || "N/A"} {customer.lastName || "N/A"}
              </div>
              <div className="text-sm text-gray-500">
                {customer.email || "N/A"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "contact",
      title: "Contact",
      render: (order) => {
        const customer = order.user || {};
        return (
          <>
            <div className="text-sm text-gray-900">
              {customer.phoneNumber || "N/A"}
            </div>
            <div className="text-sm text-gray-500">
              {order.shippingAddress?.address || "No address"}
            </div>
          </>
        );
      },
    },
    {
      key: "date",
      title: "Date",
      render: (order) => new Date(order.createdAt).toLocaleDateString(),
    },
    {
      key: "total",
      title: "Total",
      render: (order) => `$${formatCurrency(order.totalOrderPrice)}`,
    },
    {
      key: "status",
      title: "Status",
      render: (order) => (
        <select
          value={order.status || "pending"}
          onChange={(e) => handleStatusChange(order._id, e.target.value)}
          disabled={
            updatingOrderId === order._id ||
            !adminUser ||
            adminUser.role !== "admin"
          }
          className={`text-sm rounded-full px-2 py-1 font-semibold ${
            statusColors[order.status] || statusColors.pending
          } ${
            updatingOrderId === order._id ||
            !adminUser ||
            adminUser.role !== "admin"
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      ),
    },
    {
      key: "payment",
      title: "Payment",
      render: (order) => (
        <div>
          <Badge
            className={`rounded-full px-2 py-1 text-sm font-semibold ${
              paymentStatusColors[order.paymentStatus] ||
              paymentStatusColors.pending
            }`}
          >
            {order.paymentStatus}
          </Badge>
          <div className="text-xs text-gray-500 mt-1">
            {order.paymentMethod}
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (order) => (
        <div className="flex space-x-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedOrder(order);
              setIsModalOpen(true);
            }}
          >
            <FiEye className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleExport(order._id)}
            disabled
            title="Export functionality coming soon"
          >
            <FiDownload className="w-5 h-5" />
          </Button>
        </div>
      ),
    },
  ];

  if (ordersLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="text-gray-600 text-lg">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <div className="flex space-x-4">
          <Button onClick={() => handleExport("all")} disabled>
            <FiDownload className="w-5 h-5 mr-2" />
            Export All (Coming Soon)
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Input
          type="text"
          placeholder="Search by customer name, email, or order..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="">All Payment Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <Card>
        <Table columns={columns} data={filteredOrders} />
      </Card>

      {/* Order Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedOrder ? getOrderName(selectedOrder) : "Order Details"}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Customer Information
              </h3>
              <div className="flex items-start space-x-4">
                {(() => {
                  const customer = selectedOrder.user || {};
                  return (
                    <>
                      <img
                        src={
                          customer.profilePicture ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            `${customer.firstName || ""} ${
                              customer.lastName || ""
                            }`
                          )}`
                        }
                        alt={`${customer.firstName || ""} ${
                          customer.lastName || ""
                        }`}
                        className="h-20 w-20 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Name: {customer.firstName || "N/A"}{" "}
                              {customer.lastName || "N/A"}
                            </p>
                            <p className="text-sm text-gray-500">
                              Email: {customer.email || "N/A"}
                            </p>
                            <p className="text-sm text-gray-500">
                              Phone: {customer.phoneNumber || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Order Date:{" "}
                              {new Date(
                                selectedOrder.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {selectedOrder.shippingAddress?.address && (
                          <p className="text-sm text-gray-500 mt-2">
                            Address: {selectedOrder.shippingAddress.address},{" "}
                            {selectedOrder.shippingAddress.city},{" "}
                            {selectedOrder.shippingAddress.postalCode},{" "}
                            {selectedOrder.shippingAddress.country}
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Payment Information
                </h3>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-900">
                    Method: {selectedOrder.paymentMethod || "N/A"}
                  </p>
                  <p className="text-sm text-gray-900">
                    Status:{" "}
                    <Badge
                      variant={
                        selectedOrder.paymentStatus === "paid"
                          ? "success"
                          : "warning"
                      }
                    >
                      {selectedOrder.paymentStatus || "N/A"}
                    </Badge>
                  </p>
                  <p className="text-sm text-gray-900">
                    Paid: {selectedOrder.isPaid ? "Yes" : "No"}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Delivery Information
                </h3>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-900">
                    Status:{" "}
                    <Badge
                      variant={
                        selectedOrder.status === "delivered"
                          ? "success"
                          : selectedOrder.status === "cancelled"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {selectedOrder.status || "N/A"}
                    </Badge>
                  </p>
                  <p className="text-sm text-gray-900">
                    Delivered: {selectedOrder.isDelivered ? "Yes" : "No"}
                  </p>
                  {selectedOrder.deliveredAt && (
                    <p className="text-sm text-gray-900">
                      Delivered At:{" "}
                      {new Date(selectedOrder.deliveredAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Item
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Price
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedOrder.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.product?.name || "N/A"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          ${formatCurrency(item.price)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          ${formatCurrency(item.quantity * item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan="3"
                        className="px-4 py-2 text-sm font-medium text-gray-900 text-right"
                      >
                        Total
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        ${formatCurrency(selectedOrder.totalOrderPrice)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
