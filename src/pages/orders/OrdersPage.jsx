import React, { useState } from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Badge from "../../components/Badge";
import { FiEye, FiDownload, FiFileText } from "react-icons/fi";
import toast from "react-hot-toast";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Input from "../../components/Input";
import axios from "axios";
import { useTranslation } from "../../hooks/useTranslation";

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
  const { currentLanguage } = useTranslation();
  const { t } = useTranslation();

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

  // Fetch single order by ID
  const getOrderById = async (orderId) => {
    try {
      const response = await axios.get(`${base_url}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return response.data.data.order;
    } catch (error) {
      console.error("Error fetching order:", error);
      throw error;
    }
  };

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
    return `#${order._id.slice(-6)}`;
  };

  // Helper function to safely get localized text
  const getLocalizedText = (text, fallback = "N/A") => {
    if (!text) return fallback;
    if (typeof text === "string") return text;
    if (typeof text === "object" && text !== null) {
      // Handle nested objects with en/ar properties
      if (text.en || text.ar) {
        return text[currentLanguage] || text.en || text.ar || fallback;
      }
      // Handle arrays - join with comma
      if (Array.isArray(text)) {
        return (
          text
            .map((item) => getLocalizedText(item, ""))
            .filter(Boolean)
            .join(", ") || fallback
        );
      }
      // Handle other object types - convert to string if possible
      try {
        return String(text);
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  // Helper function to safely render any text (prevents React errors)
  const safeRender = (text, fallback = "N/A") => {
    const localizedText = getLocalizedText(text, fallback);
    return typeof localizedText === "string" ? localizedText : fallback;
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

  const handleExport = async (orderId = null) => {
    try {
      let orderData;

      if (orderId && orderId !== "all") {
        // Export single order
        orderData = await getOrderById(orderId);
        downloadOrderData(orderData, `order-${orderId.slice(-6)}`);
      } else {
        // Export all orders
        const response = await axios.get(`${base_url}/api/orders`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        orderData = response.data.data.orders;
        downloadOrderData(orderData, "all-orders");
      }

      toast.success("Export completed successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export order data");
    }
  };

  const downloadOrderData = (data, filename) => {
    // Create a formatted version of the data
    const formattedData = {
      exportDate: new Date().toISOString(),
      data: data,
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(formattedData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${
      new Date().toISOString().split("T")[0]
    }.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadOrderAsPDF = async (orderData) => {
    try {
      console.log("Starting PDF export...");

      // Dynamic import for jsPDF
      const jsPDFModule = await import("jspdf");
      const { jsPDF } = jsPDFModule;

      console.log("jsPDF loaded successfully");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.text("Order Details", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 20;

      // Order ID
      doc.setFontSize(12);
      doc.text(`Order ID: ${orderData._id}`, 20, yPosition);
      yPosition += 15;

      // Customer Info
      if (orderData.customer) {
        doc.text(
          `Customer: ${orderData.customer.firstName} ${orderData.customer.lastName}`,
          20,
          yPosition
        );
        yPosition += 10;
        doc.text(`Email: ${orderData.customer.email}`, 20, yPosition);
        yPosition += 15;
      }

      // Order Items
      doc.text("Order Items:", 20, yPosition);
      yPosition += 10;

      orderData.items?.forEach((item, index) => {
        const productName = getLocalizedText(
          item.product?.name,
          "Unknown Product"
        );
        const quantity = item.quantity;
        const price = formatCurrency(item.price);
        const total = formatCurrency(item.quantity * item.price);

        doc.text(`${index + 1}. ${productName}`, 30, yPosition);
        yPosition += 8;
        doc.text(
          `   Quantity: ${quantity} | Price: $${price} | Total: $${total}`,
          30,
          yPosition
        );
        yPosition += 12;

        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
      });

      // Total
      yPosition += 10;
      doc.setFontSize(14);
      doc.text(
        `Total: $${formatCurrency(orderData.totalOrderPrice)}`,
        20,
        yPosition
      );

      // Download PDF
      const filename = `order-${orderData._id.slice(-6)}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      console.log("Saving PDF as:", filename);
      doc.save(filename);

      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(`Failed to export PDF: ${error.message}`);
    }
  };

  const handleViewOrderDetails = async (order) => {
    try {
      // Fetch fresh order data by ID
      const freshOrderData = await getOrderById(order._id);
      setSelectedOrder(freshOrderData);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to load order details");
      // Fallback to using the order from the list
      setSelectedOrder(order);
      setIsModalOpen(true);
    }
  };

  // Table columns definition
  const columns = [
    {
      key: "order",
      title: t("dashboard.order"),
      render: (order) => getOrderName(order),
    },
    {
      key: "customer",
      title: t("dashboard.customer"),
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
      title: t("dashboard.contact"),
      render: (order) => {
        const customer = order.user || {};
        return (
          <>
            <div className="text-sm text-gray-900">
              {customer.phoneNumber || "N/A"}
            </div>
            <div className="text-sm text-gray-500">
              {safeRender(
                order.shippingAddress?.address,
                t("dashboard.noAddress")
              )}
            </div>
          </>
        );
      },
    },
    {
      key: "date",
      title: t("dashboard.date"),
      render: (order) => new Date(order.createdAt).toLocaleDateString(),
    },
    {
      key: "items",
      title: t("dashboard.items"),
      render: (order) => (
        <div className="text-sm text-gray-900">
          {order.items?.length || 0} {t("dashboard.item")}
        </div>
      ),
    },
    {
      key: "total",
      title: t("dashboard.total"),
      render: (order) => `$${formatCurrency(order.totalOrderPrice)}`,
    },
    {
      key: "status",
      title: t("dashboard.status"),
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
          <option value="pending">{t("dashboard.statusPending")}</option>
          <option value="processing">{t("dashboard.statusProcessing")}</option>
          <option value="shipped">{t("dashboard.statusShipped")}</option>
          <option value="delivered">{t("dashboard.statusDelivered")}</option>
          <option value="cancelled">{t("dashboard.statusCancelled")}</option>
        </select>
      ),
    },
    {
      key: "payment",
      title: t("dashboard.payment"),
      render: (order) => (
        <div>
          <Badge
            className={`rounded-full px-2 py-1 text-sm font-semibold ${
              paymentStatusColors[order.paymentStatus] ||
              paymentStatusColors.pending
            }`}
          >
            {safeRender(
              order.paymentStatusDisplay,
              order.paymentStatus || "N/A"
            )}
          </Badge>
          <div className="text-xs text-gray-500 mt-1">
            {safeRender(
              order.paymentMethodDisplay,
              order.paymentMethod || "N/A"
            )}
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      title: t("dashboard.actions"),
      render: (order) => (
        <div className="flex space-x-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewOrderDetails(order)}
          >
            <FiEye className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleExport(order._id)}
            title="Export as JSON"
          >
            <FiDownload className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              try {
                const orderData = await getOrderById(order._id);
                await downloadOrderAsPDF(orderData);
              } catch (error) {
                console.error("Error exporting PDF:", error);
                toast.error("Failed to export PDF");
              }
            }}
            title="Export as PDF"
          >
            <FiFileText className="w-5 h-5" />
          </Button>
        </div>
      ),
    },
  ];

  if (ordersLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="text-gray-600 text-lg">
          {t("dashboard.loadingOrders")}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("dashboard.orders")}
        </h1>
        <div className="flex space-x-4">
          <Button onClick={() => handleExport("all")}>
            <FiDownload className="w-5 h-5 mr-2" />
            {t("dashboard.exportAll")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Input
          type="text"
          placeholder={t("dashboard.searchOrders")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="">{t("dashboard.allStatus")}</option>
          <option value="pending">{t("dashboard.statusPending")}</option>
          <option value="processing">{t("dashboard.statusProcessing")}</option>
          <option value="shipped">{t("dashboard.statusShipped")}</option>
          <option value="delivered">{t("dashboard.statusDelivered")}</option>
          <option value="cancelled">{t("dashboard.statusCancelled")}</option>
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="">{t("dashboard.allPaymentStatus")}</option>
          <option value="pending">{t("dashboard.paymentPending")}</option>
          <option value="paid">{t("dashboard.paymentPaid")}</option>
          <option value="failed">{t("dashboard.paymentFailed")}</option>
        </select>
      </div>

      <Card>
        <Table columns={columns} data={filteredOrders} />
      </Card>

      {/* Order Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedOrder
            ? getOrderName(selectedOrder)
            : t("dashboard.orderDetails")
        }
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                {t("dashboard.customerInfo")}
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
                              {t("dashboard.name")}:{" "}
                              {customer.firstName || "N/A"}{" "}
                              {customer.lastName || "N/A"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {t("dashboard.email")}: {customer.email || "N/A"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {t("dashboard.phone")}:{" "}
                              {customer.phoneNumber || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              {t("dashboard.orderDate")}:{" "}
                              {new Date(
                                selectedOrder.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {selectedOrder.shippingAddress?.address && (
                          <p className="text-sm text-gray-500 mt-2">
                            {t("dashboard.address")}:{" "}
                            {safeRender(
                              selectedOrder.shippingAddress.address,
                              "N/A"
                            )}
                            ,{" "}
                            {safeRender(
                              selectedOrder.shippingAddress.city,
                              "N/A"
                            )}
                            , {selectedOrder.shippingAddress.postalCode},{" "}
                            {safeRender(
                              selectedOrder.shippingAddress.country,
                              "N/A"
                            )}
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
                  {t("dashboard.paymentInfo")}
                </h3>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-900">
                    {t("dashboard.method")}:{" "}
                    {safeRender(
                      selectedOrder.paymentMethodDisplay,
                      selectedOrder.paymentMethod || "N/A"
                    )}
                  </p>
                  <p className="text-sm text-gray-900">
                    {t("dashboard.status")}:{" "}
                    <Badge
                      variant={
                        selectedOrder.paymentStatus === "paid"
                          ? "success"
                          : "warning"
                      }
                    >
                      {safeRender(
                        selectedOrder.paymentStatusDisplay,
                        selectedOrder.paymentStatus || "N/A"
                      )}
                    </Badge>
                  </p>
                  <p className="text-sm text-gray-900">
                    {t("dashboard.paid")}:{" "}
                    {selectedOrder.isPaid
                      ? t("dashboard.yes")
                      : t("dashboard.no")}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  {t("dashboard.deliveryInfo")}
                </h3>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-900">
                    {t("dashboard.status")}:{" "}
                    <Badge
                      variant={
                        selectedOrder.status === "delivered"
                          ? "success"
                          : selectedOrder.status === "cancelled"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {safeRender(
                        selectedOrder.statusDisplay,
                        selectedOrder.status || "N/A"
                      )}
                    </Badge>
                  </p>
                  <p className="text-sm text-gray-900">
                    {t("dashboard.delivered")}:{" "}
                    {selectedOrder.isDelivered
                      ? t("dashboard.yes")
                      : t("dashboard.no")}
                  </p>
                  {selectedOrder.deliveredAt && (
                    <p className="text-sm text-gray-900">
                      {t("dashboard.deliveredAt")}:{" "}
                      {new Date(selectedOrder.deliveredAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {t("dashboard.items")}
              </h3>
              <div className="space-y-4">
                {selectedOrder.items?.map((item, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start space-x-4">
                      {item.product?.images?.[0] && (
                        <div className="relative">
                          <img
                            src={
                              item.product.images[0].url ||
                              item.product.images[0]
                            }
                            alt={safeRender(item.product?.name, "Product")}
                            className="w-20 h-20 rounded-lg object-cover border"
                          />
                          {/* Color indicator */}
                          {(item.colorHex || item.colorName) && (
                            <div
                              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{
                                backgroundColor: item.colorHex || "#ccc",
                              }}
                              title={safeRender(
                                item.colorName,
                                item.colorHex || "Color"
                              )}
                            ></div>
                          )}
                        </div>
                      )}
                      {!item.product?.images?.[0] && (
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500 text-xs">
                            No Image
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {safeRender(item.product?.name, "N/A")}
                            </h4>
                            {item.product?.brand && (
                              <p className="text-xs text-gray-500">
                                {t("dashboard.brand")}:{" "}
                                {safeRender(item.product.brand?.name, "N/A")}
                              </p>
                            )}
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">
                                  {t("dashboard.sku")}:
                                </span>{" "}
                                {item.sku || "N/A"}
                              </p>
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">
                                  {t("dashboard.color")}:
                                </span>{" "}
                                {(() => {
                                  if (item.colorName || item.colorHex) {
                                    const colorName = item.colorName;
                                    if (
                                      typeof colorName === "object" &&
                                      colorName !== null
                                    ) {
                                      return (
                                        <span className="inline-flex items-center space-x-1">
                                          <span
                                            className="w-3 h-3 rounded-full border border-gray-300"
                                            style={{
                                              backgroundColor:
                                                item.colorHex || "#ccc",
                                            }}
                                          ></span>
                                          <span>
                                            {safeRender(colorName, "N/A")}
                                          </span>
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="inline-flex items-center space-x-1">
                                        <span
                                          className="w-3 h-3 rounded-full border border-gray-300"
                                          style={{
                                            backgroundColor:
                                              item.colorHex || "#ccc",
                                          }}
                                        ></span>
                                        <span>
                                          {safeRender(colorName, "Color")}
                                        </span>
                                      </span>
                                    );
                                  }
                                  return "N/A";
                                })()}
                              </p>
                              {item.colorSwatchImage &&
                                item.colorSwatchImage !== "" && (
                                  <p className="text-xs text-gray-500">
                                    <span className="font-medium">
                                      {t("dashboard.colorSwatch")}:
                                    </span>{" "}
                                    <img
                                      src={item.colorSwatchImage}
                                      alt="Color swatch"
                                      className="w-4 h-4 rounded border inline-block ml-1"
                                    />
                                  </p>
                                )}
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">
                                  {t("dashboard.quantity")}:
                                </span>{" "}
                                {item.quantity}
                              </p>

                              <p className="text-xs text-gray-500">
                                <span className="font-medium">
                                  {t("dashboard.price")}:
                                </span>{" "}
                                ${formatCurrency(item.price)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              ${formatCurrency(item.quantity * item.price)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {t("dashboard.total")}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    ${formatCurrency(selectedOrder.totalOrderPrice)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => downloadOrderAsPDF(selectedOrder)}
              >
                <FiFileText className="w-4 h-4 mr-2" />
                {t("common.exportPDF")}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport(selectedOrder._id)}
              >
                <FiDownload className="w-4 h-4 mr-2" />
                {t("common.export")}
              </Button>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
