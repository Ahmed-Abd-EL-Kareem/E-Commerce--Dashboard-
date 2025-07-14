import React, { useState } from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import Input from "../../components/Input";
import Badge from "../../components/Badge";
import {
  FiEye,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX,
  FiAlertTriangle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { base_url } from "../../constants/axiosConfig";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const CustomersPage = () => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    bio: "",
    dateOfBirth: "",
    password: "",
    confirmPassword: "",
    role: "user",
    socialLinks: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
    },
  });

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await axios.get(`${base_url}/api/users`);
      return response.data.data.users;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axios.delete(`${base_url}/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["customers"]);
      toast.success("User deleted successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (selectedCustomer) {
        return axios.patch(
          `${base_url}/api/users/${selectedCustomer._id}`,
          data
        );
      }
      return axios.post(`${base_url}/api/users`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["customers"]);
      setIsModalOpen(false);
      toast.success(
        selectedCustomer
          ? "User updated successfully"
          : "User added successfully"
      );
    },
    onError: (error) => {
      toast.error(error.response.data.message);
    },
  });

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber.includes(searchTerm);

    const matchesStatus = statusFilter
      ? customer.isActive === (statusFilter === "Active")
      : true;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = (customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete._id);
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  };

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      address: "",
      bio: "",
      dateOfBirth: "",
      password: "",
      confirmPassword: "",
      role: "user",
      socialLinks: {
        facebook: "",
        twitter: "",
        instagram: "",
        linkedin: "",
      },
    });
    setIsModalOpen(true);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      address: customer.address,
      bio: customer.bio,
      dateOfBirth: formatDateForInput(customer.dateOfBirth),
      password: "",
      confirmPassword: "",
      role: customer.role || "user",
      socialLinks: customer.socialLinks,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate passwords
    if (
      !selectedCustomer &&
      (!formData.password || !formData.confirmPassword)
    ) {
      toast.error("Password and confirm password are required for new users");
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Create submission data without confirmPassword
    const submissionData = {
      ...formData,
      confirmPassword: undefined,
    };

    // Only include password if it's been changed
    if (!submissionData.password) {
      delete submissionData.password;
    }

    updateMutation.mutate(submissionData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("social.")) {
      const platform = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [platform]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const columns = [
    {
      key: "name",
      title: "Name",
      render: (row) => `${row.firstName} ${row.lastName}`,
    },
    { key: "email", title: "Email" },
    { key: "phoneNumber", title: "Phone" },
    { key: "ordersCount", title: "Orders" },
    {
      key: "totalSpent",
      title: "Total Spent",
      render: (row) => `$${row.totalSpent.toFixed(2)}`,
    },
    {
      key: "status",
      title: "Status",
      render: (row) => (
        <Badge variant={row.isActive ? "success" : "default"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (row) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditCustomer(row)}
          >
            <FiEdit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
            <FiTrash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <Button onClick={handleAddCustomer}>Add User</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <p className="text-3xl font-bold text-blue-600">{customers.length}</p>
          <p className="text-sm text-gray-500">Total Users</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-green-600">
            {customers.filter((c) => c.isActive).length}
          </p>
          <p className="text-sm text-gray-500">Active Users</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-purple-600">
            ${customers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </Card>
      </div>

      <Card>
        <div className="p-4 space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search users..."
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <Table columns={columns} data={filteredCustomers} />
          )}
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCustomer ? "Edit User" : "Add User"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleInputChange}
                required
              />

              <Input
                label="Phone Number"
                name="phoneNumber"
                placeholder="Enter phone number"
                value={formData.phoneNumber}
                onChange={handleInputChange}
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700">
                  {selectedCustomer ? "Change Password (Optional)" : "Password"}
                </h4>
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder={
                    selectedCustomer ? "Enter new password" : "Enter password"
                  }
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!selectedCustomer}
                />
                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  placeholder={
                    selectedCustomer
                      ? "Confirm new password"
                      : "Confirm password"
                  }
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!selectedCustomer}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Additional Information
              </h3>
              <Input
                label="Address"
                name="address"
                placeholder="Enter address"
                value={formData.address}
                onChange={handleInputChange}
              />

              <Input
                label="Bio"
                name="bio"
                placeholder="Enter bio"
                value={formData.bio}
                onChange={handleInputChange}
              />

              <Input
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Social Links
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Facebook"
                name="social.facebook"
                placeholder="Facebook URL"
                value={formData.socialLinks.facebook}
                onChange={handleInputChange}
              />
              <Input
                label="Twitter"
                name="social.twitter"
                placeholder="Twitter URL"
                value={formData.socialLinks.twitter}
                onChange={handleInputChange}
              />
              <Input
                label="Instagram"
                name="social.instagram"
                placeholder="Instagram URL"
                value={formData.socialLinks.instagram}
                onChange={handleInputChange}
              />
              <Input
                label="LinkedIn"
                name="social.linkedin"
                placeholder="LinkedIn URL"
                value={formData.socialLinks.linkedin}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {selectedCustomer ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCustomerToDelete(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center text-red-500 mb-4">
            <FiAlertTriangle className="w-12 h-12" />
          </div>

          <p className="text-center text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">
              {customerToDelete?.firstName} {customerToDelete?.lastName}
            </span>
            ? This action cannot be undone.
          </p>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setCustomerToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersPage;
