import React, { useState, useEffect } from "react";
import { FiEdit2, FiTrash2, FiPlus, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

// دالة استخراج النص المناسب حسب اللغة
const getLocalizedText = (obj, lang, fallback = "") => {
  if (!obj) return fallback;
  if (typeof obj === "string") return obj;
  if (typeof obj === "object" && obj !== null) {
    if (obj[lang] && typeof obj[lang] === "string" && obj[lang].trim())
      return obj[lang].trim();
    if (obj.en && typeof obj.en === "string" && obj.en.trim())
      return obj.en.trim();
    if (obj.ar && typeof obj.ar === "string" && obj.ar.trim())
      return obj.ar.trim();
  }
  return fallback;
};

const BrandsPage = () => {
  const queryClient = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem("language") || "en");

  useEffect(() => {
    const handleLanguageChange = () => {
      const newLang = localStorage.getItem("language") || "en";
      setLang(newLang);
    };

    window.addEventListener("languageChanged", handleLanguageChange);

    // Set initial language
    handleLanguageChange();

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      setImagePreview(selectedBrand?.logoUrl || null);
    } else {
      setImagePreview(null);
    }
  }, [isModalOpen, selectedBrand]);

  const fetchBrands = async () => {
    const { data } = await axios.get(`${base_url}/api/brand`);
    return data.data.brands;
  };

  const {
    data: brands = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
  });

  const filteredBrands = brands.filter(
    (brand) =>
      getLocalizedText(brand.name, lang, "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (brand.description &&
        getLocalizedText(brand.description, lang, "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  const deleteBrandMutation = useMutation({
    mutationFn: (id) => axios.delete(`${base_url}/api/brand/${id}`),
    onSuccess: () => {
      toast.success("Brand deleted successfully");
      queryClient.invalidateQueries(["brands"]);
    },
    onError: (err) => {
      toast.error("Failed to delete brand");
      console.error(err);
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: ({ id, newStatus }) =>
      axios.patch(`${base_url}/api/brand/${id}/status`, { status: newStatus }),
    onSuccess: () => {
      toast.success("Status updated successfully");
      queryClient.invalidateQueries(["brands"]);
    },
    onError: (err) => {
      toast.error("Failed to update status");
      console.error(err);
    },
  });

  const addBrandMutation = useMutation({
    mutationFn: (formData) =>
      axios.post(`${base_url}/api/brand`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      toast.success("Brand added successfully");
      queryClient.invalidateQueries(["brands"]);
    },
    onError: (err) => {
      handleFormError(err);
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: ({ id, formData }) => {
      return axios.patch(`${base_url}/api/brand/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: () => {
      toast.success("Brand updated successfully");
      queryClient.invalidateQueries(["brands"]);
    },
    onError: (err) => {
      console.error("Update error:", err.response?.data);
      handleFormError(err);
    },
  });

  const handleFormError = (err) => {
    if (err.response?.status === 413) {
      toast.error("Image file is too large. Please choose a smaller file.");
    } else {
      toast.error("Failed to submit brand");
    }
    console.error(err);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData();

    const nameInput = (e.target.name.value || "").trim();
    const descriptionInput = (e.target.description.value || "").trim();
    const website = e.target.website.value;
    const status = e.target.status.value;
    const logoFile = e.target.logo.files[0];

    // Get name values from form fields
    const nameEn = (e.target.nameEn?.value || "").trim();
    const nameAr = (e.target.nameAr?.value || "").trim();

    // Use English name for slug generation
    const nameForSlug = nameEn || nameAr || nameInput;

    formData.append("name", nameForSlug);
    formData.append("name[en]", nameEn);
    formData.append("name[ar]", nameAr);
    formData.append("description", descriptionInput);
    formData.append("websiteUrl", website);
    formData.append("status", status);

    if (logoFile) {
      formData.append("logoUrl", logoFile);
    }

    try {
      if (selectedBrand) {
        const updateData = {
          id: selectedBrand._id,
          formData: formData,
        };
        await updateBrandMutation.mutateAsync(updateData);
      } else {
        await addBrandMutation.mutateAsync(formData);
      }
      setIsModalOpen(false);
      setImagePreview(null);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(error.response?.data?.message || "Failed to update brand");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        e.target.value = "";
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImagePreview = () => {
    setImagePreview(null);
    const fileInput = document.getElementById("logo-upload");
    if (fileInput) {
      fileInput.value = "";
    }
    // If there's a selected brand, don't reset to its logo
    if (!selectedBrand) {
      setImagePreview(null);
    } else {
      setImagePreview(selectedBrand.logoUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading brands: {error?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Brands</h1>
        <button
          onClick={() => {
            setSelectedBrand(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-black bg-white border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <FiPlus className="w-5 h-5 mr-2" />
          Add Brand
        </button>
      </div>

      {/* Search */}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
        />
      </div>

      {/* Brands List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Website
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBrands?.map((brand) => (
              <tr key={brand._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {brand.logoUrl && (
                      <img
                        src={brand.logoUrl}
                        alt={getLocalizedText(brand.name, lang)}
                        className="h-10 w-10 rounded-full mr-3 object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}
                    <div className="text-sm font-medium text-gray-900">
                      {getLocalizedText(brand.name, lang)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 max-w-xs truncate">
                    {getLocalizedText(brand.description, lang)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {brand.websiteUrl && (
                    <a
                      href={brand.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-900 text-sm"
                    >
                      {brand.websiteUrl}
                    </a>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={brand.status}
                    onChange={(e) =>
                      statusChangeMutation.mutate({
                        id: brand._id,
                        newStatus: e.target.value,
                      })
                    }
                    className={`text-sm rounded-full px-2 py-1 font-semibold border-0 ${
                      brand.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedBrand(brand);
                      setIsModalOpen(true);
                    }}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    <FiEdit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setBrandToDelete(brand);
                      setIsDeleteModalOpen(true);
                    }}
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

      {/* Brand Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedBrand ? "Edit Brand" : "Add Brand"}
                    </h2>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <span className="sr-only">Close</span>
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-white px-6 py-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="nameEn"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Name (English)
                        </label>
                        <input
                          type="text"
                          id="nameEn"
                          name="nameEn"
                          defaultValue={
                            selectedBrand
                              ? getLocalizedText(selectedBrand.name, "en")
                              : ""
                          }
                          className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="nameAr"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Name (Arabic)
                        </label>
                        <input
                          type="text"
                          id="nameAr"
                          name="nameAr"
                          defaultValue={
                            selectedBrand
                              ? getLocalizedText(selectedBrand.name, "ar")
                              : ""
                          }
                          className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={3}
                        defaultValue={
                          selectedBrand
                            ? getLocalizedText(selectedBrand.description, lang)
                            : ""
                        }
                        className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="logo"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Logo
                      </label>
                      <div className="mt-1 flex flex-col items-center">
                        <div className="w-full flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                          <div className="space-y-1 text-center">
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                              aria-hidden="true"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="logo-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                              >
                                <span>Upload a file</span>
                                <input
                                  id="logo-upload"
                                  name="logo"
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={handleFileChange}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">
                              PNG, JPG, GIF up to 5MB
                            </p>
                          </div>
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                          <div className="mt-4 relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-32 w-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={clearImagePreview}
                              className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="website"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Website
                      </label>
                      <input
                        type="url"
                        id="website"
                        name="website"
                        defaultValue={selectedBrand?.websiteUrl || ""}
                        className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="status"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        defaultValue={selectedBrand?.status || "active"}
                        className="mt-1 p-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                          isSubmitting
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 cursor-pointer"
                        }`}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            {selectedBrand ? "Saving..." : "Adding..."}
                          </span>
                        ) : selectedBrand ? (
                          "Save Changes"
                        ) : (
                          "Add Brand"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && brandToDelete && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsDeleteModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <FiTrash2 className="h-6 w-6 text-red-600" />
                      </div>
                      <h2 className="ml-3 text-lg font-semibold text-gray-900">
                        Delete Brand
                      </h2>
                    </div>
                    <button
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <span className="sr-only">Close</span>
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-white px-6 py-4">
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-gray-900">
                        {getLocalizedText(brandToDelete.name, lang)}
                      </span>
                      ? This action cannot be undone and will permanently delete
                      this brand from the system.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        deleteBrandMutation.mutate(brandToDelete._id);
                        setIsDeleteModalOpen(false);
                        setBrandToDelete(null);
                      }}
                      className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete Brand
                    </button>
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

export default BrandsPage;
