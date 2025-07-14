import {
  MoveLeft,
  Upload,
  X,
  Plus,
  Package,
  Tag,
  Image,
  Settings,
  Sparkles,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

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

// Form validation schema
const productSchema = yup.object().shape({
  name: yup.object().shape({
    en: yup.string().required("English name is required"),
    ar: yup.string().required("Arabic name is required"),
  }),
  shortDescription: yup.object().shape({
    en: yup.string().required("English description is required"),
    ar: yup.string().required("Arabic description is required"),
  }),
  details: yup.object().shape({
    en: yup.string().required("English details are required"),
    ar: yup.string().required("Arabic details are required"),
  }),
  category: yup.string().required("Category is required"),
  subCategory: yup.string(),
  subSubcategory: yup.string(),
  brand: yup.string().required("Brand is required"),
  specifications: yup.array().of(
    yup.object().shape({
      name: yup.object().shape({
        en: yup.string().required("English name is required"),
        ar: yup.string().required("Arabic name is required"),
      }),
      value: yup.object().shape({
        en: yup.string().required("English value is required"),
        ar: yup.string().required("Arabic value is required"),
      }),
    })
  ),
  variants: yup.array().of(
    yup.object().shape({
      name: yup.object().shape({
        en: yup.string().required("English variant name is required"),
        ar: yup.string().required("Arabic variant name is required"),
      }),
      options: yup.array().of(
        yup.object().shape({
          value: yup.object().shape({
            en: yup.string().required("English value is required"),
            ar: yup.string().required("Arabic value is required"),
          }),
          sku: yup.string().required("SKU is required"),
          colorName: yup.object().shape({
            en: yup.string().required("English color name is required"),
            ar: yup.string().required("Arabic color name is required"),
          }),
          colorHex: yup.string(),
          storage: yup.string().required("Storage is required"),
          ram: yup.string().required("RAM is required"),
          price: yup
            .number()
            .required("Price is required")
            .min(0, "Price must be positive"),
          discount: yup
            .number()
            .min(0, "Discount must be positive")
            .max(100, "Discount cannot exceed 100%"),
          stock: yup
            .number()
            .required("Stock is required")
            .min(0, "Stock must be positive"),
          variantImages: yup.array().of(
            yup.object().shape({
              url: yup.string().required("Image URL is required"),
              altText: yup.object().shape({
                en: yup.string(),
                ar: yup.string(),
              }),
              public_id: yup.string(),
            })
          ),
        })
      ),
    })
  ),
});

export default function EditProductPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [lang, setLang] = useState(localStorage.getItem("language") || "en");

  useEffect(() => {
    const handleLanguageChange = () => {
      setLang(localStorage.getItem("language") || "en");
    };
    window.addEventListener("languageChanged", handleLanguageChange);
    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: {
      name: { en: "", ar: "" },
      shortDescription: { en: "", ar: "" },
      details: { en: "", ar: "" },
      category: "",
      subCategory: "",
      subSubcategory: "",
      brand: "",
      specifications: [],
      variants: [
        {
          name: { en: "", ar: "" },
          options: [
            {
              value: { en: "", ar: "" },
              sku: "",
              colorName: { en: "", ar: "" },
              colorHex: "",
              storage: "",
              ram: "",
              price: "",
              discount: "",
              stock: "",
              variantImages: [],
            },
          ],
        },
      ],
    },
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: "variants",
  });

  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const selectedCategory = watch("category");
  const selectedSubcategory = watch("subCategory");
  const specifications = watch("specifications");

  // Fetch product data
  const {
    data: product,
    status,
    isLoading: productLoading,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const response = await axios.get(`${base_url}/api/product/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fill form when product data changes and status is success
  useEffect(() => {
    if (status === "success" && product) {
      // Fill basic information
      setValue("name", product.name);
      setValue("shortDescription", product.shortDescription);
      setValue("details", product.details);
      setValue("category", product.category?._id || "");
      setValue("subCategory", product.subCategory?._id || "");
      setValue("subSubcategory", product.subSubcategory?._id || "");
      setValue("brand", product.brand?._id || "");

      // Handle specifications
      if (product.specifications) {
        setValue("specifications", product.specifications);
      }

      // Handle variants
      if (product.variants && product.variants.length > 0) {
        // Remove default variant
        removeVariant(0);

        // Add variants from data
        product.variants.forEach((variant) => {
          appendVariant({
            name: variant.name,
            options: variant.options.map((option) => ({
              value: option.value,
              sku: option.sku,
              colorName: option.colorName,
              colorHex: option.colorHex,
              storage: option.storage,
              ram: option.ram,
              price: option.price,
              discount: option.discount,
              stock: option.stock,
              variantImages: option.variantImages || [],
            })),
          });
        });
      }

      // Set cover image - use first image as cover
      if (product.images && product.images.length > 0) {
        setCoverImage(product.images[0]?.url);
      }
    }
  }, [status, product, setValue, removeVariant, appendVariant]);

  const fetchCategories = async () => {
    const response = await axios.get(`${base_url}/api/categories`);
    return response.data.data;
  };

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const response = await axios.get(`${base_url}/api/brand`);
      return response.data.data.brands;
    },
  });

  // Find the selected category object from the categories array
  const currentCategory = categories?.find(
    (cat) => cat._id === selectedCategory
  );
  // Find the selected subcategory object from the current category
  const currentSubcategory = currentCategory?.subcategories?.find(
    (sub) => sub._id === selectedSubcategory
  );

  const handleBack = () => {
    navigate("/dashboard/products");
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
    }
  };

  const handleVariantImageChange = (variantIndex, optionIndex, files) => {
    const newImages = Array.from(files);
    const currentImages =
      watch(`variants.${variantIndex}.options.${optionIndex}.variantImages`) ||
      [];
    setValue(`variants.${variantIndex}.options.${optionIndex}.variantImages`, [
      ...currentImages,
      ...newImages.map((file) => ({ url: URL.createObjectURL(file), file })),
    ]);
  };

  const removeVariantImage = (variantIndex, optionIndex, imageIndex) => {
    const currentImages =
      watch(`variants.${variantIndex}.options.${optionIndex}.variantImages`) ||
      [];
    const updatedImages = currentImages.filter((_, i) => i !== imageIndex);
    setValue(
      `variants.${variantIndex}.options.${optionIndex}.variantImages`,
      updatedImages
    );
  };

  const handleAddOption = (variantIndex) => {
    const currentOptions = watch(`variants.${variantIndex}.options`) || [];
    setValue(`variants.${variantIndex}.options`, [
      ...currentOptions,
      {
        storage: "",
        ram: "",
        price: "",
        discount: "",
        stock: "",
      },
    ]);
  };

  const handleRemoveOption = (variantIndex, optionIndex) => {
    const currentOptions = watch(`variants.${variantIndex}.options`) || [];
    const updatedOptions = currentOptions.filter(
      (_, index) => index !== optionIndex
    );
    setValue(`variants.${variantIndex}.options`, updatedOptions);
  };

  const updateProduct = useMutation({
    mutationFn: async (formData) => {
      const response = await axios.patch(
        `${base_url}/api/product/${id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Product updated successfully");
      queryClient.invalidateQueries(["products"]);
      navigate("/dashboard/products");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update product");
      console.error("Mutation error:", error);
    },
  });

  const onSubmit = async (data) => {
    setSaveStatus(null);
    setLoading(true);
    try {
      // نسخ صور الخيار الأول لباقي الخيارات
      data.variants.forEach((variant) => {
        if (variant.options.length > 0) {
          const firstImages = variant.options[0].variantImages || [];
          variant.options.forEach((option, idx) => {
            if (idx !== 0) option.variantImages = firstImages;
          });
        }
      });

      const productFormData = new FormData();

      // Append basic information as objects
      productFormData.append("name[en]", data.name.en);
      productFormData.append("name[ar]", data.name.ar);
      productFormData.append("shortDescription[en]", data.shortDescription.en);
      productFormData.append("shortDescription[ar]", data.shortDescription.ar);
      productFormData.append("details[en]", data.details.en);
      productFormData.append("details[ar]", data.details.ar);

      productFormData.append("category", data.category);
      productFormData.append("subCategory", data.subCategory || "");
      productFormData.append("subSubcategory", data.subSubcategory || "");
      productFormData.append("brand", data.brand);

      // Handle specifications
      data.specifications.forEach((spec, index) => {
        productFormData.append(
          `specifications[${index}][name][en]`,
          spec.name.en
        );
        productFormData.append(
          `specifications[${index}][name][ar]`,
          spec.name.ar
        );
        productFormData.append(
          `specifications[${index}][value][en]`,
          spec.value.en
        );
        productFormData.append(
          `specifications[${index}][value][ar]`,
          spec.value.ar
        );
      });

      // Handle variants
      data.variants.forEach((variant, variantIndex) => {
        productFormData.append(
          `variants[${variantIndex}][name][en]`,
          variant.name.en
        );
        productFormData.append(
          `variants[${variantIndex}][name][ar]`,
          variant.name.ar
        );

        variant.options.forEach((option, optionIndex) => {
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][value][en]`,
            option.value.en
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][value][ar]`,
            option.value.ar
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][sku]`,
            option.sku
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][colorName][en]`,
            option.colorName.en
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][colorName][ar]`,
            option.colorName.ar
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][colorHex]`,
            option.colorHex || ""
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][storage]`,
            option.storage
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][ram]`,
            option.ram || ""
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][price]`,
            option.price
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][discount]`,
            option.discount || 0
          );
          productFormData.append(
            `variants[${variantIndex}][options][${optionIndex}][stock]`,
            option.stock
          );

          // Handle variant images
          option.variantImages.forEach((image, imageIndex) => {
            if (image.file) {
              productFormData.append(
                `variants[${variantIndex}][options][${optionIndex}][variantImages][${imageIndex}]`,
                image.file
              );
            } else if (image.url) {
              productFormData.append(
                `variants[${variantIndex}][options][${optionIndex}][variantImages][${imageIndex}][url]`,
                image.url
              );
              productFormData.append(
                `variants[${variantIndex}][options][${optionIndex}][variantImages][${imageIndex}][altText][en]`,
                image.altText?.en || ""
              );
              productFormData.append(
                `variants[${variantIndex}][options][${optionIndex}][variantImages][${imageIndex}][altText][ar]`,
                image.altText?.ar || ""
              );
              productFormData.append(
                `variants[${variantIndex}][options][${optionIndex}][variantImages][${imageIndex}][public_id]`,
                image.public_id || ""
              );
            }
          });
        });
      });

      // Handle cover image
      if (coverImage instanceof File) {
        productFormData.append("coverImage", coverImage);
      } else if (coverImage) {
        productFormData.append("coverImage[url]", coverImage);
      }

      await updateProduct.mutateAsync(productFormData);
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
      toast.error("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Form Errors:", errors);
    }
  }, [errors]);

  if (productLoading || categoriesLoading || brandsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen rounded-2xl">
      <div className="">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="group inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors mb-6"
          >
            <MoveLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">
              {getLocalizedText(
                { en: "Back To Products", ar: "العودة إلى المنتجات" },
                lang
              )}
            </span>
          </button>
          <div className="rounded-2xl px-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {getLocalizedText(
                    { en: "Edit Product", ar: "تعديل المنتج" },
                    lang
                  )}
                </h1>
                <p className="text-slate-600 mt-1">
                  {getLocalizedText(
                    {
                      en: "Update and configure your product listing",
                      ar: "تحديث وتكوين قائمة المنتجات الخاصة بك",
                    },
                    lang
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {getLocalizedText(
                  { en: "Product Details", ar: "تفاصيل المنتج" },
                  lang
                )}
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {getLocalizedText(
                  { en: "Inventory Management", ar: "إدارة المخزون" },
                  lang
                )}
              </div>
              <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {getLocalizedText(
                  { en: "Rich Media", ar: "الوسائط الغنية" },
                  lang
                )}
              </div>
            </div>
          </div>
        </div>

        {saveStatus === "success" && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
            {getLocalizedText(
              {
                en: "Product updated successfully!",
                ar: "تم تحديث المنتج بنجاح!",
              },
              lang
            )}
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {getLocalizedText(
              {
                en: "Failed to update product. Please check your data.",
                ar: "فشل تحديث المنتج. يرجى التحقق من بياناتك.",
              },
              lang
            )}
          </div>
        )}
        {Object.keys(errors).length > 0 && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {getLocalizedText(
              {
                en: "Please fill all required fields correctly.",
                ar: "يرجى ملء جميع الحقول المطلوبة بشكل صحيح.",
              },
              lang
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-black" />
                <h2 className="text-2xl font-bold text-black">
                  {getLocalizedText(
                    { en: "Basic Information", ar: "المعلومات الأساسية" },
                    lang
                  )}
                </h2>
              </div>
              <p className="text-gray-400 mt-1">
                {getLocalizedText(
                  {
                    en: "Essential product details",
                    ar: "تفاصيل المنتج الأساسية",
                  },
                  lang
                )}
              </p>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                {/* English Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {getLocalizedText(
                      { en: "English Name *", ar: "الاسم باللغة الإنجليزية *" },
                      lang
                    )}
                  </label>
                  <input
                    type="text"
                    {...register("name.en")}
                    placeholder={getLocalizedText(
                      {
                        en: "English product name",
                        ar: "اسم المنتج باللغة الإنجليزية",
                      },
                      lang
                    )}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.name?.en ? "border-red-500" : "border-slate-200"
                    } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80`}
                    required
                  />
                  {errors.name?.en && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.name.en.message}
                    </p>
                  )}
                </div>

                {/* Arabic Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {getLocalizedText(
                      { en: "Arabic Name *", ar: "الاسم باللغة العربية *" },
                      lang
                    )}
                  </label>
                  <input
                    type="text"
                    {...register("name.ar")}
                    placeholder={getLocalizedText(
                      {
                        en: "Arabic product name",
                        ar: "اسم المنتج باللغة العربية",
                      },
                      lang
                    )}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.name?.ar ? "border-red-500" : "border-slate-200"
                    } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80`}
                    required
                  />
                  {errors.name?.ar && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.name.ar.message}
                    </p>
                  )}
                </div>

                {/* English Short Description */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText(
                      {
                        en: "English Short Description *",
                        ar: "وصف قصير باللغة الإنجليزية *",
                      },
                      lang
                    )}
                  </label>
                  <textarea
                    {...register("shortDescription.en")}
                    placeholder={getLocalizedText(
                      {
                        en: "English short description...",
                        ar: "وصف قصير باللغة الإنجليزية...",
                      },
                      lang
                    )}
                    rows={2}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.shortDescription?.en
                        ? "border-red-500"
                        : "border-slate-200"
                    } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 resize-none`}
                  />
                  {errors.shortDescription?.en && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.shortDescription.en.message}
                    </p>
                  )}
                </div>

                {/* Arabic Short Description */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText(
                      {
                        en: "Arabic Short Description *",
                        ar: "وصف قصير باللغة العربية *",
                      },
                      lang
                    )}
                  </label>
                  <textarea
                    {...register("shortDescription.ar")}
                    placeholder={getLocalizedText(
                      {
                        en: "Arabic short description...",
                        ar: "وصف قصير باللغة العربية...",
                      },
                      lang
                    )}
                    rows={2}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.shortDescription?.ar
                        ? "border-red-500"
                        : "border-slate-200"
                    } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 resize-none`}
                  />
                  {errors.shortDescription?.ar && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.shortDescription.ar.message}
                    </p>
                  )}
                </div>

                {/* English Details */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText(
                      {
                        en: "English Details *",
                        ar: "تفاصيل المنتج باللغة الإنجليزية *",
                      },
                      lang
                    )}
                  </label>
                  <textarea
                    {...register("details.en")}
                    placeholder={getLocalizedText(
                      {
                        en: "English product details...",
                        ar: "تفاصيل المنتج باللغة الإنجليزية...",
                      },
                      lang
                    )}
                    rows={4}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.details?.en ? "border-red-500" : "border-slate-200"
                    } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 resize-none`}
                  />
                  {errors.details?.en && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.details.en.message}
                    </p>
                  )}
                </div>

                {/* Arabic Details */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText(
                      {
                        en: "Arabic Details *",
                        ar: "تفاصيل المنتج باللغة العربية *",
                      },
                      lang
                    )}
                  </label>
                  <textarea
                    {...register("details.ar")}
                    placeholder={getLocalizedText(
                      {
                        en: "Arabic product details...",
                        ar: "تفاصيل المنتج باللغة العربية...",
                      },
                      lang
                    )}
                    rows={4}
                    className={`w-full px-4 py-3 border-2 ${
                      errors.details?.ar ? "border-red-500" : "border-slate-200"
                    } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 resize-none`}
                  />
                  {errors.details?.ar && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.details.ar.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {/* Category Select */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      {getLocalizedText(
                        { en: "Category *", ar: "الفئة *" },
                        lang
                      )}
                    </label>
                    <select
                      {...register("category")}
                      disabled={categoriesLoading}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.category ? "border-red-500" : "border-slate-200"
                      } rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-200 bg-white/80 disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">
                        {getLocalizedText(
                          {
                            en: "Select main category",
                            ar: "اختر الفئة الرئيسية",
                          },
                          lang
                        )}
                      </option>
                      {!categoriesLoading &&
                        categories?.map((category) => (
                          <option key={category._id} value={category._id}>
                            {getLocalizedText(category.name, lang)}
                          </option>
                        ))}
                    </select>
                    {errors.category && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.category.message}
                      </p>
                    )}
                  </div>

                  {/* Subcategory Select */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      {getLocalizedText(
                        { en: "Subcategory", ar: "الفئة الفرعية" },
                        lang
                      )}
                    </label>
                    <select
                      {...register("subCategory")}
                      disabled={!selectedCategory || categoriesLoading}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.subCategory
                          ? "border-red-500"
                          : "border-slate-200"
                      } rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-200 bg-white/80 disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">
                        {getLocalizedText(
                          {
                            en: "Select subcategory",
                            ar: "اختر الفئة الفرعية",
                          },
                          lang
                        )}
                      </option>
                      {!categoriesLoading &&
                        currentCategory?.subcategories?.map((subcategory) => (
                          <option key={subcategory._id} value={subcategory._id}>
                            {getLocalizedText(subcategory.name, lang)}
                          </option>
                        ))}
                    </select>
                    {errors.subCategory && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.subCategory.message}
                      </p>
                    )}
                  </div>

                  {/* Sub-subcategory Select */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      {getLocalizedText(
                        { en: "Sub-subcategory", ar: "الفئة الفرعية الفرعية" },
                        lang
                      )}
                    </label>
                    <select
                      {...register("subSubcategory")}
                      disabled={!selectedSubcategory || categoriesLoading}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.subSubcategory
                          ? "border-red-500"
                          : "border-slate-200"
                      } rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-200 bg-white/80 disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">
                        {getLocalizedText(
                          {
                            en: "Select sub-subcategory",
                            ar: "اختر الفئة الفرعية الفرعية",
                          },
                          lang
                        )}
                      </option>
                      {!categoriesLoading &&
                        currentSubcategory?.subSubcategories?.map(
                          (subSubcategory) => (
                            <option
                              key={subSubcategory._id}
                              value={subSubcategory._id}
                            >
                              {getLocalizedText(subSubcategory.name, lang)}
                            </option>
                          )
                        )}
                    </select>
                    {errors.subSubcategory && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.subSubcategory.message}
                      </p>
                    )}
                  </div>

                  {/* Brand Select */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      {getLocalizedText(
                        { en: "Brand *", ar: "العلامة التجارية *" },
                        lang
                      )}
                    </label>
                    <select
                      {...register("brand")}
                      disabled={brandsLoading}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.brand ? "border-red-500" : "border-slate-200"
                      } rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-200 bg-white/80 disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">
                        {getLocalizedText(
                          { en: "Select brand", ar: "اختر العلامة التجارية" },
                          lang
                        )}
                      </option>
                      {!brandsLoading &&
                        brands?.map((brand) => (
                          <option key={brand._id} value={brand._id}>
                            {getLocalizedText(brand.name, lang)}
                          </option>
                        ))}
                    </select>
                    {errors.brand && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.brand.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {/* cover Image */}
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mt-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">
                      {getLocalizedText(
                        { en: "Cover Image", ar: "صورة الغلاف" },
                        lang
                      )}
                    </label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        className="hidden"
                        id="cover-image"
                      />
                      <label
                        htmlFor="cover-image"
                        className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-2xl p-8 text-center transition-all duration-300 group-hover:bg-violet-50"
                      >
                        {coverImage ? (
                          <div className="relative">
                            <img
                              src={
                                coverImage instanceof File
                                  ? URL.createObjectURL(coverImage)
                                  : coverImage
                              }
                              alt={getLocalizedText(
                                { en: "Cover preview", ar: "معاينة الغلاف" },
                                lang
                              )}
                              className="w-full h-32 object-contain rounded-xl mb-4"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setCoverImage(null);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-200 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                              <Upload className="w-8 h-8 text-violet-600" />
                            </div>
                            <p className="font-medium text-slate-700 mb-1">
                              {getLocalizedText(
                                {
                                  en: "Upload Cover Image",
                                  ar: "تحميل صورة الغلاف",
                                },
                                lang
                              )}
                            </p>
                            <p className="text-sm text-slate-500">
                              {getLocalizedText(
                                {
                                  en: "PNG, JPG, WEBP up to 10MB",
                                  ar: "PNG, JPG, WEBP حتى 10 ميجا بايت",
                                },
                                lang
                              )}
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6" />
                  <div>
                    <h2 className="text-2xl font-bold">
                      {getLocalizedText(
                        { en: "Product Variants", ar: "متغيرات المنتج" },
                        lang
                      )}
                    </h2>
                    <p className="text-gray-400 mt-1">
                      {getLocalizedText(
                        {
                          en: "Add different variations of your product",
                          ar: "أضف متغيرات مختلفة لمنتجك",
                        },
                        lang
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    appendVariant({
                      name: { en: "", ar: "" },
                      options: [
                        {
                          value: { en: "", ar: "" },
                          sku: "",
                          colorName: { en: "", ar: "" },
                          colorHex: "",
                          storage: "",
                          ram: "",
                          price: "",
                          discount: "",
                          stock: "",
                          variantImages: [],
                        },
                      ],
                    })
                  }
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 cursor-pointer border border-gray-200 rounded-xl font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
                >
                  <Plus className="w-4 h-4" />
                  {getLocalizedText(
                    { en: "Add Variant", ar: "إضافة متغير" },
                    lang
                  )}
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-8">
                {variantFields.map((variant, variantIndex) => (
                  <div
                    key={variant.id}
                    className="p-6 border border-gray-200 rounded-xl space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">
                        {getLocalizedText(
                          { en: "Variant Group", ar: "مجموعة المتغيرات" },
                          lang
                        )}{" "}
                        {variantIndex + 1}
                      </h3>
                      {variantFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariant(variantIndex)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-red-500" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Variant Name (English) */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          {getLocalizedText(
                            {
                              en: "Variant Group Name (English) *",
                              ar: "اسم مجموعة المتغيرات (الإنجليزية) *",
                            },
                            lang
                          )}
                        </label>
                        <input
                          type="text"
                          {...register(`variants.${variantIndex}.name.en`)}
                          placeholder={getLocalizedText(
                            {
                              en: "English variant group name",
                              ar: "اسم مجموعة المتغيرات باللغة الإنجليزية",
                            },
                            lang
                          )}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.variants?.[variantIndex]?.name?.en
                              ? "border-red-500"
                              : "border-slate-200"
                          } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200`}
                          required
                        />
                        {errors.variants?.[variantIndex]?.name?.en && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.variants[variantIndex].name.en.message}
                          </p>
                        )}
                      </div>

                      {/* Variant Name (Arabic) */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          {getLocalizedText(
                            {
                              en: "Variant Group Name (Arabic) *",
                              ar: "اسم مجموعة المتغيرات (العربية) *",
                            },
                            lang
                          )}
                        </label>
                        <input
                          type="text"
                          {...register(`variants.${variantIndex}.name.ar`)}
                          placeholder={getLocalizedText(
                            {
                              en: "Arabic variant group name",
                              ar: "اسم مجموعة المتغيرات باللغة العربية",
                            },
                            lang
                          )}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.variants?.[variantIndex]?.name?.ar
                              ? "border-red-500"
                              : "border-slate-200"
                          } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200`}
                          required
                        />
                        {errors.variants?.[variantIndex]?.name?.ar && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.variants[variantIndex].name.ar.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-700">
                            {getLocalizedText(
                              { en: "Variant Options", ar: "خيارات المتغيرات" },
                              lang
                            )}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleAddOption(variantIndex)}
                            className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 cursor-pointer border border-gray-200 rounded-lg font-medium transition-colors flex items-center gap-2 backdrop-blur-sm"
                          >
                            <Plus className="w-4 h-4" />
                            {getLocalizedText(
                              { en: "Add Option", ar: "إضافة خيار" },
                              lang
                            )}
                          </button>
                        </div>

                        <div className="space-y-6">
                          {(
                            watch(`variants.${variantIndex}.options`) || []
                          ).map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-6 space-y-6"
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="text-lg font-medium text-slate-700">
                                  {getLocalizedText(
                                    { en: "Option", ar: "الخيار" },
                                    lang
                                  )}{" "}
                                  {optionIndex + 1}
                                </h5>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveOption(
                                      variantIndex,
                                      optionIndex
                                    )
                                  }
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                                >
                                  <X className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* إذا كان الخيار الأول، أظهر جميع الحقول */}
                                {optionIndex === 0 && (
                                  <>
                                    {/* English Value */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-semibold text-slate-700">
                                        {getLocalizedText(
                                          {
                                            en: "English Value *",
                                            ar: "القيمة باللغة الإنجليزية *",
                                          },
                                          lang
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        {...register(
                                          `variants.${variantIndex}.options.${optionIndex}.value.en`
                                        )}
                                        placeholder={getLocalizedText(
                                          {
                                            en: "English value",
                                            ar: "القيمة باللغة الإنجليزية",
                                          },
                                          lang
                                        )}
                                        className={`w-full px-4 py-3 border-2 ${
                                          errors.variants?.[variantIndex]
                                            ?.options?.[optionIndex]?.value?.en
                                            ? "border-red-500"
                                            : "border-gray-200"
                                        } rounded-lg transition-all duration-200 bg-white/80`}
                                      />
                                      {errors.variants?.[variantIndex]
                                        ?.options?.[optionIndex]?.value?.en && (
                                        <p className="text-red-500 text-sm">
                                          {
                                            errors.variants[variantIndex]
                                              .options[optionIndex].value.en
                                              .message
                                          }
                                        </p>
                                      )}
                                    </div>
                                    {/* Arabic Value */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-semibold text-slate-700">
                                        {getLocalizedText(
                                          {
                                            en: "Arabic Value *",
                                            ar: "القيمة باللغة العربية *",
                                          },
                                          lang
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        {...register(
                                          `variants.${variantIndex}.options.${optionIndex}.value.ar`
                                        )}
                                        placeholder={getLocalizedText(
                                          {
                                            en: "Arabic value",
                                            ar: "القيمة باللغة العربية",
                                          },
                                          lang
                                        )}
                                        className={`w-full px-4 py-3 border-2 ${
                                          errors.variants?.[variantIndex]
                                            ?.options?.[optionIndex]?.value?.ar
                                            ? "border-red-500"
                                            : "border-gray-200"
                                        } rounded-lg transition-all duration-200 bg-white/80`}
                                      />
                                      {errors.variants?.[variantIndex]
                                        ?.options?.[optionIndex]?.value?.ar && (
                                        <p className="text-red-500 text-sm">
                                          {
                                            errors.variants[variantIndex]
                                              .options[optionIndex].value.ar
                                              .message
                                          }
                                        </p>
                                      )}
                                    </div>
                                    {/* SKU */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-semibold text-slate-700">
                                        {getLocalizedText(
                                          { en: "SKU *", ar: "الرمز المميز *" },
                                          lang
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        {...register(
                                          `variants.${variantIndex}.options.${optionIndex}.sku`
                                        )}
                                        placeholder={getLocalizedText(
                                          { en: "SKU", ar: "الرمز المميز" },
                                          lang
                                        )}
                                        className={`w-full px-4 py-3 border-2 ${
                                          errors.variants?.[variantIndex]
                                            ?.options?.[optionIndex]?.sku
                                            ? "border-red-500"
                                            : "border-gray-200"
                                        } rounded-lg transition-all duration-200 bg-white/80`}
                                      />
                                      {errors.variants?.[variantIndex]
                                        ?.options?.[optionIndex]?.sku && (
                                        <p className="text-red-500 text-sm">
                                          {
                                            errors.variants[variantIndex]
                                              .options[optionIndex].sku.message
                                          }
                                        </p>
                                      )}
                                    </div>
                                    {/* English Color Name */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-semibold text-slate-700">
                                        {getLocalizedText(
                                          {
                                            en: "English Color Name *",
                                            ar: "اسم اللون باللغة الإنجليزية *",
                                          },
                                          lang
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        {...register(
                                          `variants.${variantIndex}.options.${optionIndex}.colorName.en`
                                        )}
                                        placeholder={getLocalizedText(
                                          {
                                            en: "English color name",
                                            ar: "اسم اللون باللغة الإنجليزية",
                                          },
                                          lang
                                        )}
                                        className={`w-full px-4 py-3 border-2 ${
                                          errors.variants?.[variantIndex]
                                            ?.options?.[optionIndex]?.colorName
                                            ?.en
                                            ? "border-red-500"
                                            : "border-gray-200"
                                        } rounded-lg transition-all duration-200 bg-white/80`}
                                      />
                                      {errors.variants?.[variantIndex]
                                        ?.options?.[optionIndex]?.colorName
                                        ?.en && (
                                        <p className="text-red-500 text-sm">
                                          {
                                            errors.variants[variantIndex]
                                              .options[optionIndex].colorName.en
                                              .message
                                          }
                                        </p>
                                      )}
                                    </div>
                                    {/* Arabic Color Name */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-semibold text-slate-700">
                                        {getLocalizedText(
                                          {
                                            en: "Arabic Color Name *",
                                            ar: "اسم اللون باللغة العربية *",
                                          },
                                          lang
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        {...register(
                                          `variants.${variantIndex}.options.${optionIndex}.colorName.ar`
                                        )}
                                        placeholder={getLocalizedText(
                                          {
                                            en: "Arabic color name",
                                            ar: "اسم اللون باللغة العربية",
                                          },
                                          lang
                                        )}
                                        className={`w-full px-4 py-3 border-2 ${
                                          errors.variants?.[variantIndex]
                                            ?.options?.[optionIndex]?.colorName
                                            ?.ar
                                            ? "border-red-500"
                                            : "border-gray-200"
                                        } rounded-lg transition-all duration-200 bg-white/80`}
                                      />
                                      {errors.variants?.[variantIndex]
                                        ?.options?.[optionIndex]?.colorName
                                        ?.ar && (
                                        <p className="text-red-500 text-sm">
                                          {
                                            errors.variants[variantIndex]
                                              .options[optionIndex].colorName.ar
                                              .message
                                          }
                                        </p>
                                      )}
                                    </div>
                                    {/* Color Hex */}
                                    <div className="space-y-2">
                                      <label className="text-sm font-semibold text-slate-700">
                                        {getLocalizedText(
                                          {
                                            en: "Color Hex Code",
                                            ar: "رمز اللون",
                                          },
                                          lang
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        {...register(
                                          `variants.${variantIndex}.options.${optionIndex}.colorHex`
                                        )}
                                        placeholder={getLocalizedText(
                                          { en: "#FFFFFF", ar: "#FFFFFF" },
                                          lang
                                        )}
                                        className={`w-full px-4 py-3 border-2 border-gray-200 rounded-lg transition-all duration-200 bg-white/80`}
                                      />
                                    </div>
                                  </>
                                )}
                                {/* الحقول المشتركة للجميع */}
                                {/* Storage */}
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">
                                    {getLocalizedText(
                                      { en: "Storage *", ar: "التخزين *" },
                                      lang
                                    )}
                                  </label>
                                  <input
                                    type="text"
                                    {...register(
                                      `variants.${variantIndex}.options.${optionIndex}.storage`
                                    )}
                                    placeholder={getLocalizedText(
                                      {
                                        en: "e.g., 128GB",
                                        ar: "مثال: 128 جيجابايت",
                                      },
                                      lang
                                    )}
                                    className={`w-full px-4 py-3 border-2 ${
                                      errors.variants?.[variantIndex]
                                        ?.options?.[optionIndex]?.storage
                                        ? "border-red-500"
                                        : "border-gray-200"
                                    } rounded-lg transition-all duration-200 bg-white/80`}
                                  />
                                  {errors.variants?.[variantIndex]?.options?.[
                                    optionIndex
                                  ]?.storage && (
                                    <p className="text-red-500 text-sm">
                                      {
                                        errors.variants[variantIndex].options[
                                          optionIndex
                                        ].storage.message
                                      }
                                    </p>
                                  )}
                                </div>
                                {/* RAM */}
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">
                                    {getLocalizedText(
                                      { en: "RAM", ar: "الرام" },
                                      lang
                                    )}
                                  </label>
                                  <input
                                    type="text"
                                    {...register(
                                      `variants.${variantIndex}.options.${optionIndex}.ram`
                                    )}
                                    placeholder={getLocalizedText(
                                      {
                                        en: "e.g., 8GB",
                                        ar: "مثال: 8 جيجابايت",
                                      },
                                      lang
                                    )}
                                    className={`w-full px-4 py-3 border-2 border-gray-200 rounded-lg transition-all duration-200 bg-white/80`}
                                  />
                                  {errors.variants?.[variantIndex]?.options?.[
                                    optionIndex
                                  ]?.ram && (
                                    <p className="text-red-500 text-sm">
                                      {
                                        errors.variants[variantIndex].options[
                                          optionIndex
                                        ].ram.message
                                      }
                                    </p>
                                  )}
                                </div>
                                {/* Price */}
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">
                                    {getLocalizedText(
                                      { en: "Price *", ar: "السعر *" },
                                      lang
                                    )}
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      {...register(
                                        `variants.${variantIndex}.options.${optionIndex}.price`
                                      )}
                                      placeholder={getLocalizedText(
                                        { en: "0.00", ar: "0.00" },
                                        lang
                                      )}
                                      min="0"
                                      step="0.01"
                                      className={`w-full pl-8 pr-3 py-3 border-2 ${
                                        errors.variants?.[variantIndex]
                                          ?.options?.[optionIndex]?.price
                                          ? "border-red-500"
                                          : "border-gray-200"
                                      } rounded-lg transition-all duration-200 bg-white/80`}
                                    />
                                  </div>
                                  {errors.variants?.[variantIndex]?.options?.[
                                    optionIndex
                                  ]?.price && (
                                    <p className="text-red-500 text-sm">
                                      {
                                        errors.variants[variantIndex].options[
                                          optionIndex
                                        ].price.message
                                      }
                                    </p>
                                  )}
                                </div>
                                {/* Discount */}
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">
                                    {getLocalizedText(
                                      { en: "Discount (%)", ar: "الخصم (%)" },
                                      lang
                                    )}
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      {...register(
                                        `variants.${variantIndex}.options.${optionIndex}.discount`
                                      )}
                                      placeholder={getLocalizedText(
                                        { en: "0", ar: "0" },
                                        lang
                                      )}
                                      min="0"
                                      max="100"
                                      className={`w-full px-3 py-3 border-2 ${
                                        errors.variants?.[variantIndex]
                                          ?.options?.[optionIndex]?.discount
                                          ? "border-red-500"
                                          : "border-gray-200"
                                      } rounded-lg transition-all duration-200 bg-white/80`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                      %
                                    </span>
                                  </div>
                                  {errors.variants?.[variantIndex]?.options?.[
                                    optionIndex
                                  ]?.discount && (
                                    <p className="text-red-500 text-sm">
                                      {
                                        errors.variants[variantIndex].options[
                                          optionIndex
                                        ].discount.message
                                      }
                                    </p>
                                  )}
                                </div>
                                {/* Stock */}
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">
                                    {getLocalizedText(
                                      { en: "Stock *", ar: "المخزون *" },
                                      lang
                                    )}
                                  </label>
                                  <input
                                    type="number"
                                    {...register(
                                      `variants.${variantIndex}.options.${optionIndex}.stock`
                                    )}
                                    placeholder={getLocalizedText(
                                      {
                                        en: "Available quantity",
                                        ar: "الكمية المتاحة",
                                      },
                                      lang
                                    )}
                                    min="0"
                                    className={`w-full px-4 py-3 border-2 ${
                                      errors.variants?.[variantIndex]
                                        ?.options?.[optionIndex]?.stock
                                        ? "border-red-500"
                                        : "border-gray-200"
                                    } rounded-lg transition-all duration-200 bg-white/80`}
                                  />
                                  {errors.variants?.[variantIndex]?.options?.[
                                    optionIndex
                                  ]?.stock && (
                                    <p className="text-red-500 text-sm">
                                      {
                                        errors.variants[variantIndex].options[
                                          optionIndex
                                        ].stock.message
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700">
                                  {getLocalizedText(
                                    {
                                      en: "Variant Images",
                                      ar: "صور المتغيرات",
                                    },
                                    lang
                                  )}
                                </label>
                                <div className="relative group">
                                  {optionIndex === 0 && (
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={(e) =>
                                        handleVariantImageChange(
                                          variantIndex,
                                          optionIndex,
                                          e.target.files
                                        )
                                      }
                                      className="hidden"
                                      id={`variant-images-${variantIndex}-${optionIndex}`}
                                    />
                                  )}
                                  <label
                                    htmlFor={`variant-images-${variantIndex}-${optionIndex}`}
                                    className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-2xl p-8 text-center transition-all duration-300 group-hover:bg-purple-50"
                                    style={
                                      optionIndex !== 0
                                        ? {
                                            pointerEvents: "none",
                                            opacity: 0.5,
                                          }
                                        : {}
                                    }
                                  >
                                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-200 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                      <Upload className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <p className="font-medium text-slate-700 mb-1">
                                      {getLocalizedText(
                                        {
                                          en: "Upload Variant Images",
                                          ar: "تحميل صور المتغيرات",
                                        },
                                        lang
                                      )}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                      {getLocalizedText(
                                        {
                                          en: "Multiple images supported",
                                          ar: "صور متعددة مدعومة",
                                        },
                                        lang
                                      )}
                                    </p>
                                  </label>
                                </div>
                                {(
                                  watch(
                                    `variants.${variantIndex}.options.${optionIndex}.variantImages`
                                  ) || []
                                ).length > 0 && (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                                    {(optionIndex === 0
                                      ? watch(
                                          `variants.${variantIndex}.options.${optionIndex}.variantImages`
                                        )
                                      : watch(
                                          `variants.${variantIndex}.options.0.variantImages`
                                        )
                                    ).map((image, imgIndex) => (
                                      <div
                                        key={imgIndex}
                                        className="relative group"
                                      >
                                        <img
                                          src={image.url}
                                          alt={`${getLocalizedText(
                                            { en: "Variant", ar: "متغير" },
                                            lang
                                          )} ${
                                            variantIndex + 1
                                          } ${getLocalizedText(
                                            { en: "image", ar: "صورة" },
                                            lang
                                          )} ${imgIndex + 1}`}
                                          className="w-full h-26 object-contain rounded-lg bg-gray-50"
                                        />
                                        {optionIndex === 0 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeVariantImage(
                                                variantIndex,
                                                optionIndex,
                                                imgIndex
                                              )
                                            }
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {getLocalizedText(
                      { en: "Product Specifications", ar: "مواصفات المنتج" },
                      lang
                    )}
                  </h2>
                  <p className="text-gray-400 mt-1">
                    {getLocalizedText(
                      {
                        en: "Technical details and features",
                        ar: "التفاصيل الفنية والميزات",
                      },
                      lang
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                {(specifications || []).map((spec, index) => (
                  <div
                    key={index}
                    className="p-6 border border-gray-300 bg-gray-50 rounded-xl"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">
                        {getLocalizedText(
                          { en: "Specification", ar: "المواصفة" },
                          lang
                        )}{" "}
                        {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newSpecs = [...specifications];
                          newSpecs.splice(index, 1);
                          setValue("specifications", newSpecs);
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Specification Name (English) */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          {getLocalizedText(
                            {
                              en: "English Name *",
                              ar: "اسم المواصفة باللغة الإنجليزية *",
                            },
                            lang
                          )}
                        </label>
                        <input
                          type="text"
                          {...register(`specifications.${index}.name.en`)}
                          placeholder={getLocalizedText(
                            {
                              en: "English name",
                              ar: "اسم المواصفة باللغة الإنجليزية",
                            },
                            lang
                          )}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.specifications?.[index]?.name?.en
                              ? "border-red-500"
                              : "border-gray-200"
                          } rounded-lg transition-all duration-200 bg-white/80`}
                        />
                        {errors.specifications?.[index]?.name?.en && (
                          <p className="text-red-500 text-sm">
                            {errors.specifications[index].name.en.message}
                          </p>
                        )}
                      </div>

                      {/* Specification Name (Arabic) */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          {getLocalizedText(
                            {
                              en: "Arabic Name *",
                              ar: "اسم المواصفة باللغة العربية *",
                            },
                            lang
                          )}
                        </label>
                        <input
                          type="text"
                          {...register(`specifications.${index}.name.ar`)}
                          placeholder={getLocalizedText(
                            {
                              en: "Arabic name",
                              ar: "اسم المواصفة باللغة العربية",
                            },
                            lang
                          )}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.specifications?.[index]?.name?.ar
                              ? "border-red-500"
                              : "border-gray-200"
                          } rounded-lg transition-all duration-200 bg-white/80`}
                        />
                        {errors.specifications?.[index]?.name?.ar && (
                          <p className="text-red-500 text-sm">
                            {errors.specifications[index].name.ar.message}
                          </p>
                        )}
                      </div>

                      {/* Value English */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          {getLocalizedText(
                            { en: "Value (EN) *", ar: "القيمة (إنجليزي) *" },
                            lang
                          )}
                        </label>
                        <input
                          type="text"
                          {...register(`specifications.${index}.value.en`)}
                          placeholder={getLocalizedText(
                            { en: "English value", ar: "القيمة بالإنجليزية" },
                            lang
                          )}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.specifications?.[index]?.value?.en
                              ? "border-red-500"
                              : "border-gray-200"
                          } rounded-lg transition-all duration-200 bg-white/80`}
                        />
                        {errors.specifications?.[index]?.value?.en && (
                          <p className="text-red-500 text-sm">
                            {errors.specifications[index].value.en.message}
                          </p>
                        )}
                      </div>

                      {/* Value Arabic */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          {getLocalizedText(
                            { en: "Value (AR) *", ar: "القيمة (عربي) *" },
                            lang
                          )}
                        </label>
                        <input
                          type="text"
                          {...register(`specifications.${index}.value.ar`)}
                          placeholder={getLocalizedText(
                            { en: "Arabic value", ar: "القيمة بالعربية" },
                            lang
                          )}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.specifications?.[index]?.value?.ar
                              ? "border-red-500"
                              : "border-gray-200"
                          } rounded-lg transition-all duration-200 bg-white/80`}
                        />
                        {errors.specifications?.[index]?.value?.ar && (
                          <p className="text-red-500 text-sm">
                            {errors.specifications[index].value.ar.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setValue("specifications", [
                      ...specifications,
                      {
                        name: { en: "", ar: "" },
                        value: { en: "", ar: "" },
                      },
                    ]);
                  }}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {getLocalizedText(
                    { en: "Add Specification", ar: "إضافة مواصفة" },
                    lang
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                type="button"
                onClick={handleBack}
                className="px-8 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
              >
                {getLocalizedText({ en: "Cancel", ar: "إلغاء" }, lang)}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {getLocalizedText(
                      { en: "Saving Changes...", ar: "جاري حفظ التغييرات..." },
                      lang
                    )}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {getLocalizedText(
                      { en: "Save Changes", ar: "حفظ التغييرات" },
                      lang
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
