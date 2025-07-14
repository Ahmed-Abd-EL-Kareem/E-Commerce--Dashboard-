import React, { useState, useMemo, useEffect } from "react";
import Card from "../../components/Card";
import Table from "../../components/Table";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import { FiEdit2, FiTrash2, FiPlus, FiEye } from "react-icons/fi";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";

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

const ProductsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const fetchProducts = async () => {
    const response = await axios.get(`${base_url}/api/product`);
    return response.data.data;
  };

  const {
    data: products = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const fetchCategories = async () => {
    const response = await axios.get(`${base_url}/api/categories`);
    return Array.isArray(response.data.data) ? response.data.data : [];
  };

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => {
      map.set(category._id, getLocalizedText(category.name, lang, "-"));
    });
    return map;
  }, [categories, lang]);

  const deleteProductMutation = useMutation({
    mutationFn: (id) => axios.delete(`${base_url}/api/product/${id}`),
    onSuccess: () => {
      toast.success(
        getLocalizedText(
          { en: "Product deleted successfully", ar: "تم حذف المنتج بنجاح" },
          lang
        )
      );
      queryClient.invalidateQueries(["products"]);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ||
          getLocalizedText(
            { en: "Failed to delete product", ar: "فشل في حذف المنتج" },
            lang
          )
      );
      console.error(err);
    },
  });

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const searchLower = searchTerm.toLowerCase();
        const categoryMatch =
          !selectedCategory ||
          product.category?._id === selectedCategory ||
          product.subCategory?._id === selectedCategory ||
          product.subSubcategory?._id === selectedCategory;

        return (
          categoryMatch &&
          (getLocalizedText(product.name, lang, "")
            .toLowerCase()
            .includes(searchLower) ||
            (getLocalizedText(product.brand?.name, lang, "") || "")
              .toLowerCase()
              .includes(searchLower) ||
            (getProductCategory(product) || "")
              .toLowerCase()
              .includes(searchLower))
        );
      }),
    [products, searchTerm, selectedCategory, lang, categoryMap]
  );

  const handleDelete = (id) => {
    if (
      window.confirm(
        getLocalizedText(
          {
            en: "Are you sure you want to delete this product?",
            ar: "هل أنت متأكد من حذف هذا المنتج؟",
          },
          lang
        )
      )
    ) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleAddProduct = () => {
    navigate("create");
  };

  const handleEditProduct = (product) => {
    navigate(`edit/${product._id}`);
  };

  const handlePreviewProduct = (product) => {
    navigate(`preview/${product._id}`);
  };

  const getProductCategory = (product) => {
    if (!product?.category?.name) return "-";
    return getLocalizedText(product.category.name, lang, "-");
  };

  const columns = useMemo(
    () => [
      {
        key: "id",
        title: "ID",
        render: (row) => row._id.slice(-6),
      },
      {
        key: "name",
        title: getLocalizedText({ en: "Product Name", ar: "اسم المنتج" }, lang),
        render: (row) => (
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            {row.images?.length > 0 ? (
              <img
                src={row.images[0].url}
                alt={getLocalizedText(row.name, lang)}
                className="w-10 h-10 object-cover rounded"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">
                  {getLocalizedText(
                    { en: "No Image", ar: "لا توجد صورة" },
                    lang
                  )}
                </span>
              </div>
            )}
            <div>
              <div className="font-medium text-gray-900">
                {getLocalizedText(row.name, lang)}
              </div>
              <div className="text-sm text-gray-500">
                {getLocalizedText(row.brand?.name, lang)}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "category",
        title: getLocalizedText({ en: "Category", ar: "الفئة" }, lang),
        render: (row) => getProductCategory(row),
      },
      {
        key: "price",
        title: getLocalizedText({ en: "Price", ar: "السعر" }, lang),
        render: (row) => {
          const prices =
            row.variants?.flatMap((v) =>
              v.options?.map((o) => o.priceAfterDiscount)
            ) || [];
          if (!prices.length) return "-";
          const minPrice = Math.min(
            ...prices.filter((p) => typeof p === "number")
          );
          const maxPrice = Math.max(
            ...prices.filter((p) => typeof p === "number")
          );
          if (minPrice === Infinity) return "-";
          return minPrice === maxPrice
            ? `$${minPrice.toFixed(2)}`
            : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
        },
      },
      {
        key: "stock",
        title: getLocalizedText({ en: "Stock", ar: "المخزون" }, lang),
        render: (row) => (
          <Badge variant={row.totalStock > 0 ? "success" : "error"}>
            {row.totalStock > 0
              ? row.totalStock
              : getLocalizedText(
                  { en: "Out of Stock", ar: "نفذ المخزون" },
                  lang
                )}
          </Badge>
        ),
      },
      {
        key: "status",
        title: getLocalizedText({ en: "Status", ar: "الحالة" }, lang),
        render: (row) => (
          <Badge variant={row.isActive ? "success" : "error"}>
            {row.isActive
              ? getLocalizedText({ en: "Active", ar: "نشط" }, lang)
              : getLocalizedText({ en: "Inactive", ar: "غير نشط" }, lang)}
          </Badge>
        ),
      },
      {
        key: "actions",
        title: getLocalizedText({ en: "Actions", ar: "الإجراءات" }, lang),
        render: (row) => (
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePreviewProduct(row);
              }}
              className="p-1 text-gray-600 hover:text-gray-800"
              title={getLocalizedText({ en: "Preview", ar: "معاينة" })}
            >
              <FiEye className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditProduct(row);
              }}
              className="p-1 text-blue-600 hover:text-blue-800"
              title={getLocalizedText({ en: "Edit", ar: "تعديل" })}
            >
              <FiEdit2 className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row._id);
              }}
              className="p-1 text-red-600 hover:text-red-800"
              title={getLocalizedText({ en: "Delete", ar: "حذف" })}
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          </div>
        ),
      },
    ],
    [
      lang,
      deleteProductMutation,
      handlePreviewProduct,
      handleEditProduct,
      handleDelete,
      getProductCategory,
    ]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-500">
        <p>
          {getLocalizedText(
            { en: "Error loading products", ar: "خطأ في تحميل المنتجات" },
            lang
          )}
          : {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {getLocalizedText({ en: "Products", ar: "المنتجات" }, lang)}
        </h1>
        <Button onClick={handleAddProduct} className="flex items-center">
          <FiPlus className="mx-2" />
          {getLocalizedText({ en: "Add Product", ar: "إضافة منتج" }, lang)}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4 rtl:space-x-reverse">
        <div className="flex-1">
          <input
            type="text"
            placeholder={getLocalizedText(
              { en: "Search products...", ar: "البحث في المنتجات..." },
              lang
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border bg-white border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">
            {getLocalizedText(
              { en: "All Categories", ar: "جميع الفئات" },
              lang
            )}
          </option>
          {isLoadingCategories ? (
            <option disabled>
              {getLocalizedText(
                { en: "Loading categories...", ar: "جاري تحميل الفئات..." },
                lang
              )}
            </option>
          ) : isErrorCategories ? (
            <option disabled>
              {getLocalizedText(
                { en: "Error loading categories", ar: "خطأ في تحميل الفئات" },
                lang
              )}
            </option>
          ) : (
            categories.map((category) => (
              <option key={category._id} value={category._id}>
                {getLocalizedText(category.name, lang, "-")}
              </option>
            ))
          )}
        </select>
      </div>

      <Card>
        <Table columns={columns} data={filteredProducts} />
      </Card>
    </div>
  );
};

export default ProductsPage;
