import { useState, useEffect, Fragment } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";
import { useTranslation as useI18nTranslation } from "react-i18next";

const CategoriesPage = () => {
  const { t } = useTranslation();
  const { i18n } = useI18nTranslation();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  console.log("Auth Token:", token); // Debug log for token
  console.log("Auth Headers:", { Authorization: `Bearer ${token}` }); // Debug log for headers

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Accept-Language": i18n.language === "ar" ? "ar" : "en",
  });

  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for subcategories
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);

  // New state for sub-subcategories
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState(null);
  const [isSubSubcategoryModalOpen, setIsSubSubcategoryModalOpen] =
    useState(false);

  // Helper functions for multilingual data
  const getLocalizedText = (textObj, fallback = "") => {
    const currentLanguage = i18n.language;

    if (!textObj) {
      return fallback;
    }

    // Handle simple string values (backward compatibility for legacy data)
    // Your backend returns localized strings based on Accept-Language header
    if (typeof textObj === "string" && textObj.trim()) {
      return textObj.trim();
    }

    // Handle multilingual object structure {en: "...", ar: "..."}
    if (
      typeof textObj === "object" &&
      textObj !== null &&
      !Array.isArray(textObj)
    ) {
      // Try current language first
      if (
        textObj[currentLanguage] &&
        typeof textObj[currentLanguage] === "string" &&
        textObj[currentLanguage].trim()
      ) {
        return textObj[currentLanguage].trim();
      }

      // Fallback to English if current language is not available
      if (textObj.en && typeof textObj.en === "string" && textObj.en.trim()) {
        return textObj.en.trim();
      }

      // Fallback to Arabic if English is not available
      if (textObj.ar && typeof textObj.ar === "string" && textObj.ar.trim()) {
        return textObj.ar.trim();
      }
    }

    return fallback;
  };

  // Helper function to check if data is bilingual
  const isBilingualData = (textObj) => {
    return (
      textObj &&
      typeof textObj === "object" &&
      !Array.isArray(textObj) &&
      (textObj.hasOwnProperty("en") || textObj.hasOwnProperty("ar"))
    );
  };

  // Helper function to get form values for editing (handles both legacy and bilingual data)
  const getFormValue = (textObj, language) => {
    if (!textObj) {
      return "";
    }

    // If it's a simple string (legacy data), return it for both languages
    if (typeof textObj === "string") {
      return textObj.trim();
    }

    // If it's bilingual data, return the specific language value
    if (isBilingualData(textObj)) {
      return textObj[language] || "";
    }

    return "";
  };

  const createMultilingualObject = (enText, arText) => ({
    en: enText || "",
    ar: arText || "",
  });

  const fetchCategories = async () => {
    try {
      const headers = getHeaders();
      console.log("Fetching with headers:", headers);

      const { data } = await axios.get(`${base_url}/api/categories`, {
        headers,
      });
      console.log("Raw Categories API response:", data);
      console.log("Categories data structure:", data.data);

      // The API should return the full multilingual data structure
      const categoriesData = Array.isArray(data.data) ? data.data : [];
      console.log("Processed categories data:", categoriesData);

      // Process categories and fetch subcategories
      const processedCategories = await Promise.all(
        categoriesData
          .filter((category) => category && category._id)
          .map(async (category) => {
            console.log("Processing category:", category);

            // Fetch subcategories for this category
            let subcategories = [];
            try {
              const { data: subData } = await axios.get(
                `${base_url}/api/subcategory?category=${category._id}`,
                { headers }
              );
              console.log("Subcategory API response:", subData);
              const subList = subData?.data || subData || [];

              // Process each subcategory and fetch its sub-subcategories
              subcategories = await Promise.all(
                subList.map(async (subcategory) => {
                  let subSubcategories = [];
                  try {
                    const { data: subSubData } = await axios.get(
                      `${base_url}/api/subsubcategory?subcategory=${subcategory._id}&category=${category._id}`,
                      { headers }
                    );
                    console.log("Sub-subcategory API response:", subSubData);
                    subSubcategories = subSubData?.data || subSubData || [];
                  } catch (error) {
                    console.error("Error fetching subsubcategories:", error);
                    subSubcategories = [];
                  }

                  return {
                    ...subcategory,
                    subSubcategories,
                  };
                })
              );
            } catch (error) {
              console.error("Error fetching subcategories:", error);
              subcategories = [];
            }

            return {
              ...category,
              subcategories,
            };
          })
      );

      console.log("Final processed categories:", processedCategories);
      return processedCategories;
    } catch (error) {
      console.error("Error fetching categories:", error.response?.data);
      throw error;
    }
  };

  // Separate function to fetch full bilingual data for editing
  const fetchFullCategoryData = async (categoryId) => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // No Accept-Language header to get full bilingual data
      };

      const { data } = await axios.get(
        `${base_url}/api/categories/${categoryId}`,
        { headers }
      );
      return data.data;
    } catch (error) {
      console.error("Error fetching full category data:", error);
      throw error;
    }
  };

  const fetchFullSubcategoryData = async (subcategoryId) => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // No Accept-Language header to get full bilingual data
      };

      const { data } = await axios.get(
        `${base_url}/api/subcategory/${subcategoryId}`,
        { headers }
      );
      return data.data;
    } catch (error) {
      console.error("Error fetching full subcategory data:", error);
      throw error;
    }
  };

  const fetchFullSubSubcategoryData = async (subSubcategoryId) => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // No Accept-Language header to get full bilingual data
      };

      const { data } = await axios.get(
        `${base_url}/api/subsubcategory/${subSubcategoryId}`,
        { headers }
      );
      return data.data;
    } catch (error) {
      console.error("Error fetching full sub-subcategory data:", error);
      throw error;
    }
  };

  const toggleSubcategory = (subcategoryId) => {
    setExpandedSubcategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subcategoryId)) {
        console.log("Collapsing subcategory:", subcategoryId);
        newSet.delete(subcategoryId);
      } else {
        console.log("Expanding subcategory:", subcategoryId);
        newSet.add(subcategoryId);
      }
      console.log("Expanded subcategories:", Array.from(newSet));
      return newSet;
    });
  };

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["categories", i18n.language],
    queryFn: fetchCategories,
  });

  // Sub-subcategories are now included in the main categories query

  // Debug log for categories data structure
  useEffect(() => {
    if (categories?.length > 0) {
      console.log("First category structure:", categories[0]);
      if (categories[0]?.subcategories?.length > 0) {
        console.log(
          "First subcategory structure:",
          categories[0].subcategories[0]
        );
        if (categories[0]?.subcategories[0]?.subSubcategories?.length > 0) {
          console.log(
            "First subsubcategory structure:",
            categories[0].subcategories[0].subSubcategories[0]
          );
        }
      }
    }
  }, [categories]);

  // Category Mutations
  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => {
      console.log("Deleting category with ID:", id); // Debug log
      return axios.delete(`${base_url}/api/categories/${id}`, {
        headers: getHeaders(),
      });
    },
    onSuccess: () => {
      toast.success(t("categoriesPage.categoryDeletedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "category");
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: ({ id }) => {
      console.log("Changing status for category:", id); // Debug log
      return axios.patch(
        `${base_url}/api/categories/${id}/toggle-status`,
        {},
        { headers: getHeaders() }
      );
    },
    onSuccess: () => {
      toast.success(t("categoriesPage.statusUpdatedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "status");
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: (formData) => {
      return axios.post(`${base_url}/api/categories`, formData, {
        headers: getHeaders(),
      });
    },
    onSuccess: (response) => {
      toast.success(t("categoriesPage.categoryAddedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "category");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, formData }) => {
      if (!id) {
        throw new Error("Category ID is required for update");
      }
      return axios.put(`${base_url}/api/categories/${id}`, formData, {
        headers: getHeaders(),
      });
    },
    onSuccess: (response) => {
      toast.success(t("categoriesPage.categoryUpdatedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "category");
    },
  });

  // Subcategory Mutations
  const addSubcategoryMutation = useMutation({
    mutationFn: (formData) =>
      axios.post(`${base_url}/api/subcategory`, formData, {
        headers: getHeaders(),
      }),
    onSuccess: () => {
      toast.success(t("categoriesPage.subcategoryAddedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "subcategory");
    },
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({ id, formData }) => {
      const headers = getHeaders();
      console.log("Updating subcategory:", { id, formData, headers }); // Debug log
      if (!id) {
        throw new Error("Subcategory ID is required for update");
      }
      return axios.patch(`${base_url}/api/subcategory/${id}`, formData, {
        headers,
        validateStatus: function (status) {
          return status < 500; // Resolve only if the status code is less than 500
        },
      });
    },
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success(t("categoriesPage.subcategoryUpdatedSuccess"));
        queryClient.invalidateQueries(["categories"]);
      } else {
        console.error("Unexpected response:", response);
        toast.error("Failed to update subcategory");
      }
    },
    onError: (err) => {
      console.error("Update subcategory error:", {
        config: err.config,
        response: err.response?.data,
        status: err.response?.status,
        message: err.message,
        headers: err.config?.headers,
      });
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "subcategory");
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: (id) =>
      axios.delete(`${base_url}/api/subcategory/${id}`, {
        headers: getHeaders(),
      }),
    onSuccess: () => {
      toast.success(t("categoriesPage.subcategoryDeletedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "subcategory");
    },
  });

  const changeSubcategoryStatusMutation = useMutation({
    mutationFn: (id) =>
      axios.patch(
        `${base_url}/api/subcategory/${id}/status`,
        {},
        { headers: getHeaders() }
      ),
    onSuccess: () => {
      toast.success(t("categoriesPage.statusUpdatedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      handleFormError(err, "subcategory status");
    },
  });

  // Sub-subcategory Mutations
  const addSubSubcategoryMutation = useMutation({
    mutationFn: (formData) => {
      console.log("Creating subsubcategory:", formData);
      return axios.post(`${base_url}/api/subsubcategory`, formData, {
        headers: getHeaders(),
      });
    },
    onSuccess: () => {
      toast.success(t("categoriesPage.subsubcategoryAddedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "subsubcategory");
    },
  });

  const updateSubSubcategoryMutation = useMutation({
    mutationFn: ({ id, formData }) => {
      console.log("Updating subsubcategory:", { id, formData });
      if (!id) {
        throw new Error("Subsubcategory ID is required for update");
      }
      return axios.patch(`${base_url}/api/subsubcategory/${id}`, formData, {
        headers: getHeaders(),
      });
    },
    onSuccess: () => {
      toast.success(t("categoriesPage.subsubcategoryUpdatedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "subsubcategory");
    },
  });

  const deleteSubSubcategoryMutation = useMutation({
    mutationFn: (id) => {
      console.log("Deleting subsubcategory:", id);
      return axios.delete(`${base_url}/api/subsubcategory/${id}`, {
        headers: getHeaders(),
      });
    },
    onSuccess: () => {
      toast.success(t("categoriesPage.subsubcategoryDeletedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "subsubcategory");
    },
  });

  const changeSubSubcategoryStatusMutation = useMutation({
    mutationFn: (id) => {
      console.log("Changing subsubcategory status:", id);
      return axios.patch(
        `${base_url}/api/subsubcategory/${id}/status`,
        {},
        { headers: getHeaders() }
      );
    },
    onSuccess: () => {
      toast.success(t("categoriesPage.statusUpdatedSuccess"));
      queryClient.invalidateQueries(["categories"]);
    },
    onError: (err) => {
      console.error("Status update error:", {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
      });
      if (err.response?.status === 401) {
        navigate("/login");
      }
      handleFormError(err, "subsubcategory status");
    },
  });

  const handleFormError = (err, entity = "item") => {
    const errorMessage =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      `Failed to submit ${entity}`;
    console.error(`Form error details for ${entity}:`, {
      message: errorMessage,
      data: err.response?.data,
      status: err.response?.status,
      error: err,
    });
    toast.error(errorMessage);
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const filteredCategories = categories.filter((category) => {
    const searchLower = searchTerm.toLowerCase();
    const nameEn = getLocalizedText(category.name, "").toLowerCase();
    const nameAr = category.name?.ar?.toLowerCase() || "";
    const descEn = getLocalizedText(category.description, "").toLowerCase();
    const descAr = category.description?.ar?.toLowerCase() || "";

    return (
      nameEn.includes(searchLower) ||
      nameAr.includes(searchLower) ||
      descEn.includes(searchLower) ||
      descAr.includes(searchLower)
    );
  });

  const handleDeleteCategory = (id) => {
    if (window.confirm(t("categoriesPage.deleteConfirmCategory"))) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleCategoryStatusChange = (id) => {
    statusChangeMutation.mutate({ id });
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);

    const nameEn = formData.get("name-en")?.trim();
    const nameAr = formData.get("name-ar")?.trim();
    const descEn = formData.get("description-en")?.trim();
    const descAr = formData.get("description-ar")?.trim();

    // Create data object matching the MongoDB model structure
    const data = {
      name: createMultilingualObject(nameEn, nameAr),
      description: createMultilingualObject(descEn, descAr),
      isActive: formData.get("status") === "Active",
      order: parseInt(formData.get("order")) || 0,
      image: formData.get("image")?.trim() || "",
      icon: formData.get("icon")?.trim() || "",
    };

    // Add optional meta fields only if they have values
    const metaTitleEn = formData.get("meta-title-en")?.trim();
    const metaTitleAr = formData.get("meta-title-ar")?.trim();
    if (metaTitleEn || metaTitleAr) {
      data.metaTitle = createMultilingualObject(metaTitleEn, metaTitleAr);
    }

    const metaDescEn = formData.get("meta-description-en")?.trim();
    const metaDescAr = formData.get("meta-description-ar")?.trim();
    if (metaDescEn || metaDescAr) {
      data.metaDescription = createMultilingualObject(metaDescEn, metaDescAr);
    }

    // Flexible validation: require at least one language for name and description
    if (!nameEn && !nameAr) {
      toast.error(t("categoriesPage.nameRequiredAtLeastOne"));
      setIsSubmitting(false);
      return;
    }

    if (!descEn && !descAr) {
      toast.error(t("categoriesPage.descriptionRequiredAtLeastOne"));
      setIsSubmitting(false);
      return;
    }

    // For new bilingual system, encourage both languages but don't enforce
    if ((!nameEn || !nameAr) && !selectedCategory?._id) {
      // Only show warning for new categories, not updates
      console.warn(
        "Recommended to provide both English and Arabic names for better multilingual support"
      );
    }

    // Slug will be auto-generated by backend from name

    try {
      if (selectedCategory?._id) {
        await updateCategoryMutation.mutateAsync({
          id: selectedCategory._id,
          formData: data,
        });
      } else {
        await addCategoryMutation.mutateAsync(data);
      }
      setIsModalOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      // Error is handled by mutation's onError
    } finally {
      setIsSubmitting(false);
    }
  };

  // Subcategory Handlers
  const handleDeleteSubcategory = (id) => {
    if (window.confirm(t("categoriesPage.deleteConfirmSubcategory"))) {
      deleteSubcategoryMutation.mutate(id);
    }
  };

  const handleSubcategoryStatusChange = (id) => {
    changeSubcategoryStatusMutation.mutate(id);
  };

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);

    const nameEn = formData.get("subcategory-name-en")?.trim();
    const nameAr = formData.get("subcategory-name-ar")?.trim();
    const descEn = formData.get("subcategory-description-en")?.trim();
    const descAr = formData.get("subcategory-description-ar")?.trim();

    // Create data object matching the MongoDB model structure
    const subcategoryData = {
      name: createMultilingualObject(nameEn, nameAr),
      description: createMultilingualObject(descEn, descAr),
      category: selectedCategory?._id, // Parent category ID
      isActive: formData.get("subcategory-status") === "Active",
      order: parseInt(formData.get("subcategory-order")) || 0,
      image: formData.get("subcategory-image")?.trim() || "",
      icon: formData.get("subcategory-icon")?.trim() || "",
    };

    // Add optional fields only if they have values
    const metaTitleEn = formData.get("subcategory-meta-title-en")?.trim();
    const metaTitleAr = formData.get("subcategory-meta-title-ar")?.trim();
    if (metaTitleEn || metaTitleAr) {
      subcategoryData.metaTitle = createMultilingualObject(
        metaTitleEn,
        metaTitleAr
      );
    }

    const metaDescEn = formData.get("subcategory-meta-description-en")?.trim();
    const metaDescAr = formData.get("subcategory-meta-description-ar")?.trim();
    if (metaDescEn || metaDescAr) {
      subcategoryData.metaDescription = createMultilingualObject(
        metaDescEn,
        metaDescAr
      );
    }

    // Flexible validation: require at least one language for name and description
    if (!nameEn && !nameAr) {
      toast.error(t("categoriesPage.nameRequiredAtLeastOne"));
      setIsSubmitting(false);
      return;
    }

    if (!descEn && !descAr) {
      toast.error(t("categoriesPage.descriptionRequiredAtLeastOne"));
      setIsSubmitting(false);
      return;
    }

    // Slug will be auto-generated by backend from name

    try {
      console.log("Submitting subcategory:", {
        isEdit: !!selectedSubcategory?._id,
        data: subcategoryData,
        selectedSubcategory,
      });

      if (selectedSubcategory?._id) {
        // Update existing subcategory - send all fields for proper update
        await updateSubcategoryMutation.mutateAsync({
          id: selectedSubcategory._id,
          formData: subcategoryData,
        });
      } else {
        // Create new subcategory
        if (!subcategoryData.category) {
          toast.error(t("categoriesPage.parentCategoryRequired"));
          setIsSubmitting(false);
          return;
        }
        await addSubcategoryMutation.mutateAsync(subcategoryData);
      }
      setIsSubcategoryModalOpen(false);
      setSelectedSubcategory(null);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Subcategory submission error:", {
        error,
        response: error.response?.data,
        status: error.response?.status,
      });
      // Error is handled by mutation's onError
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sub-subcategory Handlers
  const handleSubSubcategorySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);

    const nameEn = formData.get("sub-subcategory-name-en")?.trim();
    const nameAr = formData.get("sub-subcategory-name-ar")?.trim();

    // Create data object matching the MongoDB model structure
    const subSubcategoryData = {
      name: createMultilingualObject(nameEn, nameAr),
      category: selectedCategory?._id, // Parent category ID (matches MongoDB model)
      subcategory: selectedSubcategory?._id, // Parent subcategory ID (matches MongoDB model)
      isActive: formData.get("sub-subcategory-status") === "Active",
      order: parseInt(formData.get("sub-subcategory-order")) || 0,
      image: formData.get("sub-subcategory-image")?.trim() || "",
      icon: formData.get("sub-subcategory-icon")?.trim() || "",
    };

    // Add optional description field only if it has values
    const descEn = formData.get("sub-subcategory-description-en")?.trim();
    const descAr = formData.get("sub-subcategory-description-ar")?.trim();
    if (descEn || descAr) {
      subSubcategoryData.description = createMultilingualObject(descEn, descAr);
    }

    // Add optional meta fields only if they have values
    const metaTitleEn = formData.get("sub-subcategory-meta-title-en")?.trim();
    const metaTitleAr = formData.get("sub-subcategory-meta-title-ar")?.trim();
    if (metaTitleEn || metaTitleAr) {
      subSubcategoryData.metaTitle = createMultilingualObject(
        metaTitleEn,
        metaTitleAr
      );
    }

    const metaDescEn = formData
      .get("sub-subcategory-meta-description-en")
      ?.trim();
    const metaDescAr = formData
      .get("sub-subcategory-meta-description-ar")
      ?.trim();
    if (metaDescEn || metaDescAr) {
      subSubcategoryData.metaDescription = createMultilingualObject(
        metaDescEn,
        metaDescAr
      );
    }

    // Flexible validation: require at least one language for name
    if (!nameEn && !nameAr) {
      toast.error(t("categoriesPage.nameRequiredAtLeastOne"));
      setIsSubmitting(false);
      return;
    }

    // Description is optional for sub-subcategories, but if provided, validate it
    if ((descEn || descAr) && (!descEn || !descAr)) {
      console.warn(
        "Recommended to provide both English and Arabic descriptions for better multilingual support"
      );
    }

    // Slug will be auto-generated by backend from name

    try {
      console.log("Submitting sub-subcategory:", {
        isEdit: !!selectedSubSubcategory?._id,
        data: subSubcategoryData,
        selectedSubSubcategory,
        selectedCategory,
        selectedSubcategory,
      });

      if (!subSubcategoryData.category || !subSubcategoryData.subcategory) {
        toast.error(t("categoriesPage.parentCategorySubcategoryRequired"));
        setIsSubmitting(false);
        return;
      }

      if (selectedSubSubcategory?._id) {
        // Update existing sub-subcategory - send all fields for proper update
        await updateSubSubcategoryMutation.mutateAsync({
          id: selectedSubSubcategory._id,
          formData: subSubcategoryData,
        });
      } else {
        // Create new sub-subcategory
        await addSubSubcategoryMutation.mutateAsync(subSubcategoryData);
      }
      setIsSubSubcategoryModalOpen(false);
      setSelectedSubSubcategory(null);
      setSelectedSubcategory(null);
      setSelectedCategory(null);
      queryClient.invalidateQueries(["categories"]);
    } catch (error) {
      console.error("Sub-subcategory submission error:", {
        error,
        response: error.response?.data,
        status: error.response?.status,
        data: subSubcategoryData,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubSubcategoryStatusChange = (id) => {
    if (!id) {
      console.error("Invalid subsubcategory ID for status change");
      toast.error("Cannot update status: Invalid subsubcategory ID");
      return;
    }
    try {
      changeSubSubcategoryStatusMutation.mutate(id);
    } catch (error) {
      console.error("Error changing subsubcategory status:", error);
      toast.error("Failed to update subsubcategory status");
    }
  };

  const handleDeleteSubSubcategory = (id) => {
    if (!id) {
      console.error("Invalid subsubcategory ID for deletion");
      toast.error("Cannot delete: Invalid subsubcategory ID");
      return;
    }
    if (window.confirm(t("categoriesPage.deleteConfirmSubsubcategory"))) {
      try {
        deleteSubSubcategoryMutation.mutate(id);
      } catch (error) {
        console.error("Error deleting subsubcategory:", error);
        toast.error("Failed to delete subsubcategory");
      }
    }
  };

  // Update the renderSubSubcategories function
  const renderSubSubcategories = (subcategory, category) => {
    if (!expandedSubcategories.has(subcategory._id)) return null;

    // Get subsubcategories from the subcategory object directly
    const subSubList = subcategory.subSubcategories || [];

    console.log("Rendering subsubcategories for subcategory:", {
      subcategoryId: subcategory._id,
      categoryId: category._id,
      subSubsCount: subSubList.length,
      subSubList,
    });

    return (
      <>
        {subSubList.length === 0 && (
          <tr>
            <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
              {t("categoriesPage.noSubsubcategories")}
            </td>
          </tr>
        )}
        {subSubList.map((subSubcategory) => (
          <tr
            key={`subsubcategory-${subSubcategory._id}-${subcategory._id}`}
            className="bg-gray-100 hover:bg-gray-200"
          >
            <td className="px-6 py-4 whitespace-nowrap pl-20">
              <div className="text-sm font-medium text-gray-600">
                <span className="text-gray-400 mr-1">&#9492;</span>{" "}
                {getLocalizedText(subSubcategory.name)}
                {getLocalizedText(subSubcategory.slug) && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({getLocalizedText(subSubcategory.slug)})
                  </span>
                )}
              </div>
            </td>
            <td className="px-6 py-4">
              <div
                className="text-sm text-gray-500 max-w-xs truncate"
                title={getLocalizedText(subSubcategory.description)}
              >
                {getLocalizedText(subSubcategory.description)}
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <select
                value={subSubcategory.isActive ? "Active" : "Inactive"}
                onChange={() =>
                  handleSubSubcategoryStatusChange(subSubcategory._id)
                }
                className={`text-sm rounded-full px-2 py-1 font-semibold border-0 cursor-pointer focus:ring-0 ${
                  subSubcategory.isActive
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-red-100 text-red-800 hover:bg-red-200"
                }`}
              >
                <option value="Active">{t("categoriesPage.active")}</option>
                <option value="Inactive">{t("categoriesPage.inactive")}</option>
              </select>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
              <button
                onClick={async () => {
                  try {
                    const [
                      fullCategoryData,
                      fullSubcategoryData,
                      fullSubSubcategoryData,
                    ] = await Promise.all([
                      fetchFullCategoryData(category._id),
                      fetchFullSubcategoryData(subcategory._id),
                      fetchFullSubSubcategoryData(subSubcategory._id),
                    ]);

                    setSelectedCategory(fullCategoryData);
                    setSelectedSubcategory(fullSubcategoryData);
                    setSelectedSubSubcategory(fullSubSubcategoryData);
                    setIsSubSubcategoryModalOpen(true);
                  } catch (error) {
                    console.error(
                      "Error fetching full sub-subcategory data:",
                      error
                    );
                    toast.error(
                      "Failed to load sub-subcategory data for editing"
                    );
                  }
                }}
                className="text-primary-600 hover:text-primary-700 p-1 rounded-md hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                title={t("categoriesPage.editSubsubcategory")}
              >
                <FiEdit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDeleteSubSubcategory(subSubcategory._id)}
                className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                title={t("categoriesPage.deleteSubsubcategory")}
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </td>
          </tr>
        ))}
      </>
    );
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
        <p className="text-red-600">
          Error loading categories: {error?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("categoriesPage.title")}
        </h1>
        <button
          onClick={() => {
            setSelectedCategory(null); // Clear selected category for Add mode
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-white text-black border border-transparent rounded-md shadow-sm text-sm font-medium bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <FiPlus className="w-5 h-5 mr-2" />
          {t("categoriesPage.addCategory")}
        </button>
      </div>

      {/* Search */}
      <div className="flex-1">
        <input
          type="text"
          placeholder={t("categoriesPage.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Categories List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("categoriesPage.categorySubcategory")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("categoriesPage.description")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("categoriesPage.status")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("categoriesPage.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCategories
              .filter((category) => category && (category._id || category.id))
              .map((category) => (
                <Fragment key={`category-${category._id || category.id}`}>
                  {/* Category Row */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() =>
                            toggleCategory(category._id || category.id)
                          }
                          className="mr-2 text-gray-400 hover:text-gray-500 focus:outline-none p-1 rounded-full hover:bg-gray-200"
                          title={
                            expandedCategories.has(category._id || category.id)
                              ? t("categoriesPage.collapse")
                              : t("categoriesPage.expand")
                          }
                        >
                          {expandedCategories.has(
                            category._id || category.id
                          ) ? (
                            <FiChevronDown className="w-5 h-5" />
                          ) : (
                            <FiChevronRight className="w-5 h-5" />
                          )}
                        </button>
                        <div className="text-sm font-medium text-gray-900">
                          {getLocalizedText(
                            category.name,
                            t("categoriesPage.unnamedCategory")
                          )}
                          {i18n.language === "en" &&
                            typeof category.name === "object" &&
                            category.name?.ar && (
                              <div className="text-xs text-gray-500 mt-1">
                                {category.name.ar}
                              </div>
                            )}
                          {i18n.language === "ar" &&
                            typeof category.name === "object" &&
                            category.name?.en && (
                              <div className="text-xs text-gray-500 mt-1">
                                {category.name.en}
                              </div>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="text-sm text-gray-500 max-w-xs truncate"
                        title={getLocalizedText(category.description)}
                      >
                        {getLocalizedText(category.description)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={category.isActive ? "Active" : "Inactive"}
                        onChange={() =>
                          handleCategoryStatusChange(
                            category._id || category.id
                          )
                        }
                        className={`text-sm rounded-full px-2 py-1 font-semibold border-0 cursor-pointer focus:ring-0 ${
                          category.isActive
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        <option value="Active">
                          {t("categoriesPage.active")}
                        </option>
                        <option value="Inactive">
                          {t("categoriesPage.inactive")}
                        </option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                      <button
                        onClick={() => {
                          setSelectedCategory(category);
                          setSelectedSubcategory(null);
                          setIsSubcategoryModalOpen(true);
                        }}
                        className="text-green-600 hover:text-green-700 p-1 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                        title={t("categoriesPage.addSubcategory")}
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const fullCategoryData =
                              await fetchFullCategoryData(category._id);
                            setSelectedCategory(fullCategoryData);
                            setIsModalOpen(true);
                          } catch (error) {
                            console.error(
                              "Error fetching full category data:",
                              error
                            );
                            toast.error(
                              "Failed to load category data for editing"
                            );
                          }
                        }}
                        className="text-primary-600 hover:text-primary-700 p-1 rounded-md hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        title={t("categoriesPage.editCategory")}
                      >
                        <FiEdit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteCategory(category._id || category.id)
                        }
                        className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        title={t("categoriesPage.deleteCategory")}
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>

                  {/* Subcategory Rows */}
                  {expandedCategories.has(category._id) &&
                    (category.subcategories || [])
                      .filter((sub) => sub && sub._id)
                      .map((subcategory) => (
                        <Fragment key={`subcategory-${subcategory._id}`}>
                          <tr className="bg-gray-50 hover:bg-gray-100">
                            <td className="px-6 py-4 whitespace-nowrap pl-12">
                              <div className="flex items-center">
                                <button
                                  onClick={() =>
                                    toggleSubcategory(subcategory._id)
                                  }
                                  className="mr-2 text-gray-400 hover:text-gray-500 focus:outline-none p-1 rounded-full hover:bg-gray-200"
                                  title={
                                    expandedSubcategories.has(subcategory._id)
                                      ? t("categoriesPage.collapse")
                                      : t("categoriesPage.expand")
                                  }
                                >
                                  {expandedSubcategories.has(
                                    subcategory._id
                                  ) ? (
                                    <FiChevronDown className="w-5 h-5" />
                                  ) : (
                                    <FiChevronRight className="w-5 h-5" />
                                  )}
                                </button>
                                <div className="text-sm font-medium text-gray-700">
                                  <span className="text-gray-400 mr-1">
                                    &#9492;
                                  </span>{" "}
                                  {getLocalizedText(
                                    subcategory.name,
                                    t("categoriesPage.unnamedSubcategory")
                                  )}
                                  {getLocalizedText(subcategory.slug) && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      ({getLocalizedText(subcategory.slug)})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div
                                className="text-sm text-gray-500 max-w-xs truncate"
                                title={getLocalizedText(
                                  subcategory.description
                                )}
                              >
                                {getLocalizedText(subcategory.description)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={
                                  subcategory.isActive ? "Active" : "Inactive"
                                }
                                onChange={() =>
                                  handleSubcategoryStatusChange(subcategory._id)
                                }
                                className={`text-sm rounded-full px-2 py-1 font-semibold border-0 cursor-pointer focus:ring-0 ${
                                  subcategory.isActive
                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                                    : "bg-red-100 text-red-800 hover:bg-red-200"
                                }`}
                              >
                                <option value="Active">
                                  {t("categoriesPage.active")}
                                </option>
                                <option value="Inactive">
                                  {t("categoriesPage.inactive")}
                                </option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setSelectedSubcategory(subcategory);
                                  setSelectedSubSubcategory(null);
                                  setIsSubSubcategoryModalOpen(true);
                                }}
                                className="text-green-600 hover:text-green-700 p-1 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                                title={t("categoriesPage.addSubsubcategory")}
                              >
                                <FiPlus className="w-5 h-5" />
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const [
                                      fullCategoryData,
                                      fullSubcategoryData,
                                    ] = await Promise.all([
                                      fetchFullCategoryData(category._id),
                                      fetchFullSubcategoryData(subcategory._id),
                                    ]);
                                    setSelectedCategory(fullCategoryData);
                                    setSelectedSubcategory(fullSubcategoryData);
                                    setIsSubcategoryModalOpen(true);
                                  } catch (error) {
                                    console.error(
                                      "Error fetching full subcategory data:",
                                      error
                                    );
                                    toast.error(
                                      "Failed to load subcategory data for editing"
                                    );
                                  }
                                }}
                                className="text-primary-600 hover:text-primary-700 p-1 rounded-md hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title={t("categoriesPage.editSubcategory")}
                              >
                                <FiEdit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteSubcategory(subcategory._id)
                                }
                                className="text-red-600 hover:text-red-700 p-1 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                                title={t("categoriesPage.deleteSubcategory")}
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                          {/* Render sub-subcategories */}
                          {renderSubSubcategories(subcategory, category)}
                        </Fragment>
                      ))}
                </Fragment>
              ))}
          </tbody>
        </table>
      </div>

      {/* Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => {
              setIsModalOpen(false);
              setSelectedCategory(null);
            }}
          />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedCategory?._id
                        ? t("categoriesPage.editCategoryTitle")
                        : t("categoriesPage.addCategoryTitle")}
                    </h2>
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setSelectedCategory(null);
                      }}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-6 py-4">
                  <form
                    key={selectedCategory?._id || "new"}
                    onSubmit={handleCategorySubmit}
                    className="space-y-4"
                  >
                    {/* English Fields */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {t("categoriesPage.english")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            htmlFor="name-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.nameEnglish")}
                          </label>
                          <input
                            type="text"
                            id="name-en"
                            name="name-en"
                            defaultValue={getFormValue(
                              selectedCategory?.name,
                              "en"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="description-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.descriptionEnglish")}
                          </label>
                          <textarea
                            id="description-en"
                            name="description-en"
                            rows={3}
                            defaultValue={getFormValue(
                              selectedCategory?.description,
                              "en"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Arabic Fields */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {t("categoriesPage.arabic")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            htmlFor="name-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.nameArabic")}
                          </label>
                          <input
                            type="text"
                            id="name-ar"
                            name="name-ar"
                            defaultValue={getFormValue(
                              selectedCategory?.name,
                              "ar"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="description-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.descriptionArabic")}
                          </label>
                          <textarea
                            id="description-ar"
                            name="description-ar"
                            rows={3}
                            defaultValue={getFormValue(
                              selectedCategory?.description,
                              "ar"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Meta Fields */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {t("categoriesPage.seoMetaData")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            htmlFor="meta-title-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaTitleEnglish")}
                          </label>
                          <input
                            type="text"
                            id="meta-title-en"
                            name="meta-title-en"
                            defaultValue={getFormValue(
                              selectedCategory?.metaTitle,
                              "en"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            maxLength={60}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="meta-title-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaTitleArabic")}
                          </label>
                          <input
                            type="text"
                            id="meta-title-ar"
                            name="meta-title-ar"
                            defaultValue={getFormValue(
                              selectedCategory?.metaTitle,
                              "ar"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            maxLength={60}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="meta-description-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaDescriptionEnglish")}
                          </label>
                          <textarea
                            id="meta-description-en"
                            name="meta-description-en"
                            rows={2}
                            defaultValue={getFormValue(
                              selectedCategory?.metaDescription,
                              "en"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            maxLength={160}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="meta-description-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaDescriptionArabic")}
                          </label>
                          <textarea
                            id="meta-description-ar"
                            name="meta-description-ar"
                            rows={2}
                            defaultValue={getFormValue(
                              selectedCategory?.metaDescription,
                              "ar"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            maxLength={160}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="order"
                          className="block text-sm font-medium text-gray-700"
                        >
                          {t("categoriesPage.order")}
                        </label>
                        <input
                          type="number"
                          id="order"
                          name="order"
                          defaultValue={selectedCategory?.order || 0}
                          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="image"
                          className="block text-sm font-medium text-gray-700"
                        >
                          {t("categoriesPage.imageUrl")}
                        </label>
                        <input
                          type="url"
                          id="image"
                          name="image"
                          defaultValue={selectedCategory?.image || ""}
                          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="icon"
                        className="block text-sm font-medium text-gray-700"
                      >
                        {t("categoriesPage.icon")}
                      </label>
                      <input
                        type="text"
                        id="icon"
                        name="icon"
                        defaultValue={selectedCategory?.icon || ""}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder={t("categoriesPage.iconPlaceholder")}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="status"
                        className="block text-sm font-medium text-gray-700"
                      >
                        {t("categoriesPage.status")}
                      </label>
                      <select
                        id="status"
                        name="status"
                        defaultValue={
                          selectedCategory?.isActive ? "Active" : "Inactive"
                        }
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="Active">
                          {t("categoriesPage.active")}
                        </option>
                        <option value="Inactive">
                          {t("categoriesPage.inactive")}
                        </option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          setSelectedCategory(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {t("categoriesPage.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                          isSubmitting
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-primary-600 hover:bg-primary-700"
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
                            {selectedCategory?._id
                              ? t("categoriesPage.saving")
                              : t("categoriesPage.adding")}
                          </span>
                        ) : selectedCategory?._id ? (
                          t("categoriesPage.saveChanges")
                        ) : (
                          t("categoriesPage.addCategory")
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

      {/* Subcategory Modal */}
      {isSubcategoryModalOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => {
              setIsSubcategoryModalOpen(false);
              setSelectedSubcategory(null);
              setSelectedCategory(null);
            }}
          />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedSubcategory?._id
                        ? t("categoriesPage.editSubcategoryTitle")
                        : `${t("categoriesPage.addSubcategoryTo")} ${
                            getLocalizedText(selectedCategory?.name) ||
                            t("categoriesPage.title")
                          }`}
                    </h2>
                    <button
                      onClick={() => {
                        setIsSubcategoryModalOpen(false);
                        setSelectedSubcategory(null);
                        setSelectedCategory(null);
                      }}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-6 py-4">
                  <form
                    key={selectedSubcategory?._id || "new"}
                    onSubmit={handleSubcategorySubmit}
                    className="space-y-4"
                  >
                    {selectedCategory && !selectedSubcategory?._id && (
                      <div className="mb-4 p-3 bg-gray-100 rounded-md">
                        <p className="text-sm text-gray-600">
                          {t("categoriesPage.addingToCategory")}:
                          <span className="font-semibold text-gray-800">
                            {" "}
                            {getLocalizedText(selectedCategory.name)}
                          </span>
                        </p>
                      </div>
                    )}
                    {selectedSubcategory?._id && selectedCategory && (
                      <div className="mb-4 p-3 bg-gray-100 rounded-md">
                        <p className="text-sm text-gray-600">
                          {t("categoriesPage.parentCategory")}:
                          <span className="font-semibold text-gray-800">
                            {" "}
                            {getLocalizedText(selectedCategory.name)}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* English Fields */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {t("categoriesPage.english")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            htmlFor="subcategory-name-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.nameEnglish")}
                          </label>
                          <input
                            type="text"
                            id="subcategory-name-en"
                            name="subcategory-name-en"
                            defaultValue={getFormValue(
                              selectedSubcategory?.name,
                              "en"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="subcategory-description-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.descriptionEnglish")}
                          </label>
                          <textarea
                            id="subcategory-description-en"
                            name="subcategory-description-en"
                            rows={3}
                            defaultValue={getFormValue(
                              selectedSubcategory?.description,
                              "en"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Arabic Fields */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {t("categoriesPage.arabic")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            htmlFor="subcategory-name-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.nameArabic")}
                          </label>
                          <input
                            type="text"
                            id="subcategory-name-ar"
                            name="subcategory-name-ar"
                            defaultValue={getFormValue(
                              selectedSubcategory?.name,
                              "ar"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="subcategory-description-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.descriptionArabic")}
                          </label>
                          <textarea
                            id="subcategory-description-ar"
                            name="subcategory-description-ar"
                            rows={3}
                            defaultValue={getFormValue(
                              selectedSubcategory?.description,
                              "ar"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Meta Fields */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {t("categoriesPage.seoMetaData")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            htmlFor="subcategory-meta-title-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaTitleEnglish")}
                          </label>
                          <input
                            type="text"
                            id="subcategory-meta-title-en"
                            name="subcategory-meta-title-en"
                            defaultValue={getFormValue(
                              selectedSubcategory?.metaTitle,
                              "en"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            maxLength={60}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="subcategory-meta-title-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaTitleArabic")}
                          </label>
                          <input
                            type="text"
                            id="subcategory-meta-title-ar"
                            name="subcategory-meta-title-ar"
                            defaultValue={getFormValue(
                              selectedSubcategory?.metaTitle,
                              "ar"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            maxLength={60}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="subcategory-meta-description-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaDescriptionEnglish")}
                          </label>
                          <textarea
                            id="subcategory-meta-description-en"
                            name="subcategory-meta-description-en"
                            rows={2}
                            defaultValue={getFormValue(
                              selectedSubcategory?.metaDescription,
                              "en"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            maxLength={160}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="subcategory-meta-description-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaDescriptionArabic")}
                          </label>
                          <textarea
                            id="subcategory-meta-description-ar"
                            name="subcategory-meta-description-ar"
                            rows={2}
                            defaultValue={getFormValue(
                              selectedSubcategory?.metaDescription,
                              "ar"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            maxLength={160}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="subcategory-order"
                          className="block text-sm font-medium text-gray-700"
                        >
                          {t("categoriesPage.order")}
                        </label>
                        <input
                          type="number"
                          id="subcategory-order"
                          name="subcategory-order"
                          defaultValue={selectedSubcategory?.order || 0}
                          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="subcategory-image"
                          className="block text-sm font-medium text-gray-700"
                        >
                          {t("categoriesPage.imageUrl")}
                        </label>
                        <input
                          type="url"
                          id="subcategory-image"
                          name="subcategory-image"
                          defaultValue={selectedSubcategory?.image || ""}
                          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="subcategory-icon"
                        className="block text-sm font-medium text-gray-700"
                      >
                        {t("categoriesPage.icon")}
                      </label>
                      <input
                        type="text"
                        id="subcategory-icon"
                        name="subcategory-icon"
                        defaultValue={selectedSubcategory?.icon || ""}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder={t("categoriesPage.iconPlaceholder")}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="subcategory-status"
                        className="block text-sm font-medium text-gray-700"
                      >
                        {t("categoriesPage.status")}
                      </label>
                      <select
                        id="subcategory-status"
                        name="subcategory-status"
                        defaultValue={
                          selectedSubcategory?.isActive === false
                            ? "Inactive"
                            : "Active"
                        }
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="Active">
                          {t("categoriesPage.active")}
                        </option>
                        <option value="Inactive">
                          {t("categoriesPage.inactive")}
                        </option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubcategoryModalOpen(false);
                          setSelectedSubcategory(null);
                          setSelectedCategory(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {t("categoriesPage.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                          isSubmitting
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-primary-600 hover:bg-primary-700"
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
                            {selectedSubcategory?._id
                              ? t("categoriesPage.saving")
                              : t("categoriesPage.adding")}
                          </span>
                        ) : selectedSubcategory?._id ? (
                          t("categoriesPage.saveChanges")
                        ) : (
                          t("categoriesPage.addSubcategory")
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

      {/* Sub-subcategory Modal */}
      {isSubSubcategoryModalOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => {
              setIsSubSubcategoryModalOpen(false);
              setSelectedSubSubcategory(null);
              setSelectedSubcategory(null);
              setSelectedCategory(null);
            }}
          />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedSubSubcategory?._id
                        ? t("categoriesPage.editSubsubcategoryTitle")
                        : `${t("categoriesPage.addSubsubcategoryTo")} ${
                            getLocalizedText(selectedSubcategory?.name) ||
                            t("categoriesPage.addSubcategory")
                          }`}
                    </h2>
                    <button
                      onClick={() => {
                        setIsSubSubcategoryModalOpen(false);
                        setSelectedSubSubcategory(null);
                        setSelectedSubcategory(null);
                        setSelectedCategory(null);
                      }}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-6 py-4">
                  <form
                    key={selectedSubSubcategory?._id || "new"}
                    onSubmit={handleSubSubcategorySubmit}
                    className="space-y-4"
                  >
                    {selectedSubcategory && !selectedSubSubcategory?._id && (
                      <div className="mb-4 p-3 bg-gray-100 rounded-md">
                        <p className="text-sm text-gray-600">
                          {t("categoriesPage.addingToSubcategory")}:
                          <span className="font-semibold text-gray-800">
                            {" "}
                            {getLocalizedText(selectedSubcategory.name)}
                          </span>
                        </p>
                      </div>
                    )}
                    {selectedSubSubcategory?._id && selectedSubcategory && (
                      <div className="mb-4 p-3 bg-gray-100 rounded-md">
                        <p className="text-sm text-gray-600">
                          {t("categoriesPage.parentSubcategory")}:
                          <span className="font-semibold text-gray-800">
                            {" "}
                            {getLocalizedText(selectedSubcategory.name)}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* English Fields */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {t("categoriesPage.english")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            htmlFor="sub-subcategory-name-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.nameEnglish")}
                          </label>
                          <input
                            type="text"
                            id="sub-subcategory-name-en"
                            name="sub-subcategory-name-en"
                            defaultValue={getFormValue(
                              selectedSubSubcategory?.name,
                              "en"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="sub-subcategory-description-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.descriptionEnglish")}
                          </label>
                          <textarea
                            id="sub-subcategory-description-en"
                            name="sub-subcategory-description-en"
                            rows={3}
                            defaultValue={getFormValue(
                              selectedSubSubcategory?.description,
                              "en"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Arabic Fields */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {t("categoriesPage.arabic")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            htmlFor="sub-subcategory-name-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.nameArabic")}
                          </label>
                          <input
                            type="text"
                            id="sub-subcategory-name-ar"
                            name="sub-subcategory-name-ar"
                            defaultValue={getFormValue(
                              selectedSubSubcategory?.name,
                              "ar"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="sub-subcategory-description-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.descriptionArabic")}
                          </label>
                          <textarea
                            id="sub-subcategory-description-ar"
                            name="sub-subcategory-description-ar"
                            rows={3}
                            defaultValue={getFormValue(
                              selectedSubSubcategory?.description,
                              "ar"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Meta Fields */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {t("categoriesPage.seoMetaData")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            htmlFor="sub-subcategory-meta-title-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaTitleEnglish")}
                          </label>
                          <input
                            type="text"
                            id="sub-subcategory-meta-title-en"
                            name="sub-subcategory-meta-title-en"
                            defaultValue={getFormValue(
                              selectedSubSubcategory?.metaTitle,
                              "en"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            maxLength={60}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="sub-subcategory-meta-title-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaTitleArabic")}
                          </label>
                          <input
                            type="text"
                            id="sub-subcategory-meta-title-ar"
                            name="sub-subcategory-meta-title-ar"
                            defaultValue={getFormValue(
                              selectedSubSubcategory?.metaTitle,
                              "ar"
                            )}
                            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            maxLength={60}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="sub-subcategory-meta-description-en"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaDescriptionEnglish")}
                          </label>
                          <textarea
                            id="sub-subcategory-meta-description-en"
                            name="sub-subcategory-meta-description-en"
                            rows={2}
                            defaultValue={getFormValue(
                              selectedSubSubcategory?.metaDescription,
                              "en"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            maxLength={160}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="sub-subcategory-meta-description-ar"
                            className="block text-sm font-medium text-gray-700"
                          >
                            {t("categoriesPage.metaDescriptionArabic")}
                          </label>
                          <textarea
                            id="sub-subcategory-meta-description-ar"
                            name="sub-subcategory-meta-description-ar"
                            rows={2}
                            defaultValue={getFormValue(
                              selectedSubSubcategory?.metaDescription,
                              "ar"
                            )}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            dir="rtl"
                            maxLength={160}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="sub-subcategory-order"
                          className="block text-sm font-medium text-gray-700"
                        >
                          {t("categoriesPage.order")}
                        </label>
                        <input
                          type="number"
                          id="sub-subcategory-order"
                          name="sub-subcategory-order"
                          defaultValue={selectedSubSubcategory?.order || 0}
                          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="sub-subcategory-image"
                          className="block text-sm font-medium text-gray-700"
                        >
                          {t("categoriesPage.imageUrl")}
                        </label>
                        <input
                          type="url"
                          id="sub-subcategory-image"
                          name="sub-subcategory-image"
                          defaultValue={selectedSubSubcategory?.image || ""}
                          className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="sub-subcategory-icon"
                        className="block text-sm font-medium text-gray-700"
                      >
                        {t("categoriesPage.icon")}
                      </label>
                      <input
                        type="text"
                        id="sub-subcategory-icon"
                        name="sub-subcategory-icon"
                        defaultValue={selectedSubSubcategory?.icon || ""}
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder={t("categoriesPage.iconPlaceholder")}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sub-subcategory-status"
                        className="block text-sm font-medium text-gray-700"
                      >
                        {t("categoriesPage.status")}
                      </label>
                      <select
                        id="sub-subcategory-status"
                        name="sub-subcategory-status"
                        defaultValue={
                          selectedSubSubcategory?.isActive === false
                            ? "Inactive"
                            : "Active"
                        }
                        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="Active">
                          {t("categoriesPage.active")}
                        </option>
                        <option value="Inactive">
                          {t("categoriesPage.inactive")}
                        </option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubSubcategoryModalOpen(false);
                          setSelectedSubSubcategory(null);
                          setSelectedSubcategory(null);
                          setSelectedCategory(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {t("categoriesPage.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                          isSubmitting
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-primary-600 hover:bg-primary-700"
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
                            {selectedSubSubcategory?._id
                              ? t("categoriesPage.saving")
                              : t("categoriesPage.adding")}
                          </span>
                        ) : selectedSubSubcategory?._id ? (
                          t("categoriesPage.saveChanges")
                        ) : (
                          t("categoriesPage.addSubsubcategory")
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
    </div>
  );
};

export default CategoriesPage;
