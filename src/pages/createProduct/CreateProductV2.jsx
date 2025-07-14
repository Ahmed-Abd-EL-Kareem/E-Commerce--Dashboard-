import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import axios from "axios";
import slugify from "slugify";
import {
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

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

const LocaleContext = React.createContext({ locale: "en" });

const API_BASE_URL = "http://localhost:3000/api";

const ProductCreationForm = ({ defaultValues, onSubmitSuccess }) => {
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
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: defaultValues || {
      name: { en: "", ar: "" },
      slug: { en: "", ar: "" },
      shortDescription: { en: "", ar: "" },
      details: { en: "", ar: "" },
      images: [],
      basePrice: 0,
      variants: [
        {
          name: { en: "Configuration", ar: "التكوين" },
          options: [
            {
              value: { en: "", ar: "" },
              colorName: { en: "", ar: "" },
              colorHex: "",
              colorSwatchImage: "",
              storage: "",
              ram: "",
              price: 0,
              discount: 0,
              stock: 0,
              variantImages: [],
            },
          ],
        },
      ],
      specifications: [
        {
          name: { en: "", ar: "" },
          value: { en: "", ar: "" },
        },
      ],
      category: "",
      subCategory: "",
      subSubcategory: "",
      brand: "",
      isFeatured: false,
    },
  });

  const watchCategory = watch("category");
  const watchSubCategory = watch("subCategory");
  const watchProductNameEn = watch("name.en");
  const watchProductNameAr = watch("name.ar");

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({ control, name: "variants" });
  const {
    fields: specFields,
    append: appendSpec,
    remove: removeSpec,
  } = useFieldArray({ control, name: "specifications" });

  // --- React Query for Dropdown Data ---
  const {
    data: allCategories = [],
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/categories`);
      // نفترض أن التصنيفات تأتي متداخلة كما في البيانات المرسلة
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
  });

  // حذف جلب التصنيفات الفرعية والفرعية الفرعية من API منفصل
  // const { ... } = useQuery({ ... subcategories ... });
  // const { ... } = useQuery({ ... subsubcategories ... });

  // --- اختيار التصنيف الرئيسي والفرعي والفرعي الفرعي من نفس الكائن ---
  const selectedCategoryObj = allCategories.find(
    (cat) => cat._id === watchCategory
  );
  const selectedSubCategoryObj = selectedCategoryObj?.subcategories?.find(
    (sub) => sub._id === watchSubCategory
  );

  // --- Effect for Slug Generation ---
  useEffect(() => {
    if (watchProductNameEn) {
      const generatedSlugEn = slugify(watchProductNameEn, {
        lower: true,
        strict: true,
      });
      setValue("slug.en", generatedSlugEn);
    }
    if (watchProductNameAr) {
      const generatedSlugAr = slugify(watchProductNameAr, {
        lower: true,
        strict: true,
      });
      setValue("slug.ar", generatedSlugAr);
    }
  }, [watchProductNameEn, watchProductNameAr, setValue]);

  // --- React Query Mutation for Image Upload ---
  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      if (files.length === 0) return [];
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data.files;
    },
    onError: (error) => {
      console.error(
        "Upload Mutation Error:",
        error.response?.data || error.message
      );
      alert(
        "Failed to upload files: " +
          (error.response?.data?.message || error.message)
      );
    },
  });

  // --- Handle Main Product Image Upload ---
  const handleMainImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = ""; // Clear file input immediately

    try {
      const uploaded = await uploadMutation.mutateAsync(files);
      const newImages = uploaded.map((img) => ({
        url: img.url,
        altText: { en: "", ar: "" },
        isFeatured: false,
        public_id: img.public_id,
      }));
      const currentImages = watch("images") || [];
      setValue("images", [...currentImages, ...newImages]);
    } catch {
      // Error handled by uploadMutation.onError
    }
  };

  // --- Handle Variant Image Upload ---
  const handleVariantImageUpload = async (
    event,
    variantTypeIndex,
    optionIndex
  ) => {
    const files = Array.from(event.target.files);
    event.target.value = ""; // Clear file input immediately

    try {
      const uploaded = await uploadMutation.mutateAsync(files);
      const newVariantImages = uploaded.map((img) => ({
        url: img.url,
        altText: { en: "", ar: "" },
        public_id: img.public_id,
      }));

      const currentVariantOptions =
        watch(`variants.${variantTypeIndex}.options`) || [];
      const currentOption = currentVariantOptions[optionIndex] || {};
      const currentVariantImages = currentOption.variantImages || [];

      setValue(
        `variants.${variantTypeIndex}.options.${optionIndex}.variantImages`,
        [...currentVariantImages, ...newVariantImages]
      );
    } catch {
      // Error handled by uploadMutation.onError
    }
  };

  // --- Remove Image (Main) ---
  const removeMainImage = (publicIdToRemove) => {
    const currentImages = watch("images");
    const updatedImages = currentImages.filter(
      (img) => img.public_id !== publicIdToRemove
    );
    setValue("images", updatedImages);
  };

  // --- Remove Image (Variant) ---
  const removeVariantImage = (
    variantTypeIndex,
    optionIndex,
    publicIdToRemove
  ) => {
    const currentVariantOptions = watch(`variants.${variantTypeIndex}.options`);
    const currentVariantImages =
      currentVariantOptions[optionIndex].variantImages;
    const updatedVariantImages = currentVariantImages.filter(
      (img) => img.public_id !== publicIdToRemove
    );
    setValue(
      `variants.${variantTypeIndex}.options.${optionIndex}.variantImages`,
      updatedVariantImages
    );
  };

  const updateVariantImageAlt = (
    variantTypeIndex,
    optionIndex,
    public_id,
    field,
    value
  ) => {
    const options = getValues(`variants.${variantTypeIndex}.options`);
    if (!options || !options[optionIndex]) return;

    const updatedImages = options[optionIndex].variantImages.map((img) => {
      if (img.public_id === public_id) {
        return { ...img, altText: { ...img.altText, [field]: value } };
      }
      return img;
    });
    setValue(
      `variants.${variantTypeIndex}.options.${optionIndex}.variantImages`,
      updatedImages
    );
  };

  // --- React Query Mutation for Product Creation ---
  const createProductMutation = useMutation({
    mutationFn: async (productData) => {
      const response = await axios.post(`${API_BASE_URL}/product`, productData);
      return response.data;
    },
    onSuccess: (data) => {
      alert("Product created successfully!");
      reset();
      onSubmitSuccess && onSubmitSuccess(data);
    },
    onError: (error) => {
      console.error(
        "Create Product Mutation Error:",
        error.response?.data || error.message
      );
      const errorMessage =
        error.response?.data?.message || "An unexpected error occurred.";
      const errorDetails = error.response?.data?.errors
        ? JSON.stringify(error.response.data.errors, null, 2)
        : "";
      alert(`Error creating product: ${errorMessage}\n${errorDetails}`);
    },
  });

  // --- Form Submission Handler ---
  const onSubmit = (data) => {
    // Convert empty strings to null for optional fields
    if (data.subCategory === "") data.subCategory = null;
    if (data.subSubcategory === "") data.subSubcategory = null;

    // معالجة قيمة value (en/ar) وcolorName (en/ar) وcolorHex وصور المتغيرات في كل خيار من خيارات المتغيرات
    if (Array.isArray(data.variants)) {
      data.variants.forEach((variant) => {
        if (Array.isArray(variant.options) && variant.options.length > 0) {
          const firstValueEn = variant.options[0]?.value?.en || "";
          const firstValueAr = variant.options[0]?.value?.ar || "";
          const firstColorEn = variant.options[0]?.colorName?.en || "";
          const firstColorAr = variant.options[0]?.colorName?.ar || "";
          const firstColorHex = variant.options[0]?.colorHex || "";
          const firstImages = variant.options[0]?.variantImages || [];
          variant.options.forEach((option, idx) => {
            if (!option.value) option.value = {};
            if (!option.value.en) option.value.en = firstValueEn;
            if (!option.value.ar) option.value.ar = firstValueAr;
            if (!option.colorName) option.colorName = {};
            if (!option.colorName.en) option.colorName.en = firstColorEn;
            if (!option.colorName.ar) option.colorName.ar = firstColorAr;
            if (!option.colorHex) option.colorHex = firstColorHex;
            if (idx !== 0) option.variantImages = firstImages;
          });
        }
      });
    }

    createProductMutation.mutate(data);
  };

  const isFormSubmitting =
    createProductMutation.isPending || uploadMutation.isPending;

  const renderMainImage = (img, index) => {
    if (!img || !img.url) return null;

    const altText = (img && typeof img.altText === "object" && img.altText) || {
      en: "",
      ar: "",
    };

    return (
      <div
        key={img.url + index}
        className="relative group overflow-hidden rounded-md shadow-sm border border-gray-200"
      >
        {img.url.match(/\.(mp4|mov|avi)$/i) ? (
          <video
            src={img.url}
            controls
            className="w-full h-32 object-cover"
          ></video>
        ) : (
          <img
            src={img.url}
            alt={altText.en || ""}
            className="w-full h-32 object-cover"
          />
        )}
        <button
          type="button"
          onClick={() => removeMainImage(img.public_id)}
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          &times;
        </button>
        <div className="p-1">
          <label className="block text-xs font-medium text-gray-600">
            {getLocalizedText(
              { en: "Alt Text (EN)", ar: "نص بديل (الإنجليزية)" },
              lang
            )}
          </label>
          <input
            type="text"
            {...register(`images.${index}.altText.en`)}
            className="w-full text-xs p-1 border rounded"
          />
          <label className="block text-xs font-medium text-gray-600 mt-1">
            {getLocalizedText(
              { en: "Alt Text (AR)", ar: "نص بديل (العربية)" },
              lang
            )}
          </label>
          <input
            type="text"
            {...register(`images.${index}.altText.ar`)}
            className="w-full text-xs p-1 border rounded"
          />
        </div>
      </div>
    );
  };

  // --- جلب بيانات العلامات التجارية (brands) ---
  const {
    data: allBrands = [],
    isLoading: isLoadingBrands,
    isError: isErrorBrands,
  } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/brand`);
      return Array.isArray(res.data.data.brands) ? res.data.data.brands : [];
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-6 bg-white rounded-lg shadow-md w-full mx-auto my-8"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        {defaultValues
          ? getLocalizedText({ en: "Edit Product", ar: "تعديل المنتج" }, lang)
          : getLocalizedText(
              { en: "Add New Product", ar: "إضافة منتج جديد" },
              lang
            )}
      </h2>

      {/* Basic Product Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="name.en"
            className="block text-sm font-medium text-gray-700"
          >
            {getLocalizedText(
              { en: "Product Name (English)", ar: "اسم المنتج (الإنجليزية)" },
              lang
            )}
          </label>
          <input
            id="name.en"
            {...register("name.en", { required: "English Name is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
          />
          {errors.name?.en && (
            <p className="text-red-500 text-xs mt-1">
              {errors.name.en.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="name.ar"
            className="block text-sm font-medium text-gray-700"
          >
            {getLocalizedText(
              { en: "Product Name (Arabic)", ar: "اسم المنتج (العربية)" },
              lang
            )}
          </label>
          <input
            id="name.ar"
            {...register("name.ar", { required: "Arabic Name is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
          />
          {errors.name?.ar && (
            <p className="text-red-500 text-xs mt-1">
              {errors.name.ar.message}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="shortDescription.en"
          className="block text-sm font-medium text-gray-700"
        >
          {getLocalizedText(
            { en: "Short Description (English)", ar: "وصف قصير (الإنجليزية)" },
            lang
          )}
        </label>
        <textarea
          id="shortDescription.en"
          {...register("shortDescription.en")}
          rows="2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
        ></textarea>
      </div>
      <div className="mb-6">
        <label
          htmlFor="shortDescription.ar"
          className="block text-sm font-medium text-gray-700"
        >
          {getLocalizedText(
            { en: "Short Description (Arabic)", ar: "وصف قصير (العربية)" },
            lang
          )}
        </label>
        <textarea
          id="shortDescription.ar"
          {...register("shortDescription.ar")}
          rows="2"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
        ></textarea>
      </div>

      {/* Rich Text Editor for Details */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {getLocalizedText(
            { en: "Details (English)", ar: "التفاصيل (الإنجليزية)" },
            lang
          )}
        </label>
        <Controller
          name="details.en"
          control={control}
          rules={{ required: "English Details are required" }}
          render={({ field }) => (
            <TiptapEditor value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.details?.en && (
          <p className="text-red-500 text-xs mt-1">
            {errors.details.en.message}
          </p>
        )}
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {getLocalizedText(
            { en: "Details (Arabic)", ar: "التفاصيل (العربية)" },
            lang
          )}
        </label>
        <Controller
          name="details.ar"
          control={control}
          rules={{ required: "Arabic Details are required" }}
          render={({ field }) => (
            <TiptapEditor value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.details?.ar && (
          <p className="text-red-500 text-xs mt-1">
            {errors.details.ar.message}
          </p>
        )}
      </div>

      {/* Price Field */}
      <div className="mb-6">
        <label
          htmlFor="basePrice"
          className="block text-sm font-medium text-gray-700"
        >
          {getLocalizedText({ en: "Base Price", ar: "السعر الأساسي" }, lang)}
        </label>
        <input
          id="basePrice"
          type="number"
          step="0.01"
          {...register("basePrice", {
            required: "Base Price is required",
            valueAsNumber: true,
            min: { value: 0, message: "Price must be positive" },
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
        />
        {errors.basePrice && (
          <p className="text-red-500 text-xs mt-1">
            {errors.basePrice.message}
          </p>
        )}
      </div>

      {/* Category & Brand Selects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700"
          >
            {getLocalizedText({ en: "Category", ar: "الفئة" }, lang)}
          </label>
          {isLoadingCategories ? (
            <p>
              {getLocalizedText(
                { en: "Loading categories...", ar: "جاري تحميل الفئات..." },
                lang
              )}
            </p>
          ) : isErrorCategories ? (
            <p className="text-red-500">
              {getLocalizedText(
                { en: "Error loading categories", ar: "خطأ في تحميل الفئات" },
                lang
              )}
            </p>
          ) : (
            <select
              id="category"
              {...register("category", { required: "Category is required" })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            >
              <option value="">
                {getLocalizedText(
                  { en: "Select Category", ar: "اختر الفئة" },
                  lang
                )}
              </option>
              {allCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {getLocalizedText(cat.name, lang)}
                </option>
              ))}
            </select>
          )}
          {errors.category && (
            <p className="text-red-500 text-xs mt-1">
              {errors.category.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="subCategory"
            className="block text-sm font-medium text-gray-700"
          >
            {getLocalizedText({ en: "Subcategory", ar: "الفئة الفرعية" }, lang)}
          </label>
          <select
            id="subCategory"
            {...register("subCategory")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            disabled={!selectedCategoryObj}
          >
            <option value="">
              {getLocalizedText(
                { en: "Select Subcategory", ar: "اختر الفئة الفرعية" },
                lang
              )}
            </option>
            {selectedCategoryObj?.subcategories?.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {getLocalizedText(sub.name, lang)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="subSubcategory"
            className="block text-sm font-medium text-gray-700"
          >
            {getLocalizedText(
              { en: "Sub-Subcategory", ar: "الفئة الفرعية الفرعية" },
              lang
            )}
          </label>
          <select
            id="subSubcategory"
            {...register("subSubcategory")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
            disabled={!selectedSubCategoryObj}
          >
            <option value="">
              {getLocalizedText(
                {
                  en: "Select Sub-Subcategory",
                  ar: "اختر الفئة الفرعية الفرعية",
                },
                lang
              )}
            </option>
            {selectedSubCategoryObj?.subSubcategories?.map((subsub) => (
              <option key={subsub._id} value={subsub._id}>
                {getLocalizedText(subsub.name, lang)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Brand Select */}
      <div className="mb-6">
        <label
          htmlFor="brand"
          className="block text-sm font-medium text-gray-700"
        >
          {getLocalizedText({ en: "Brand", ar: "العلامة التجارية" }, lang)}
        </label>
        {isLoadingBrands ? (
          <p>
            {getLocalizedText(
              {
                en: "Loading brands...",
                ar: "جاري تحميل العلامات التجارية...",
              },
              lang
            )}
          </p>
        ) : isErrorBrands ? (
          <p className="text-red-500">
            {getLocalizedText(
              {
                en: "Error loading brands",
                ar: "خطأ في تحميل العلامات التجارية",
              },
              lang
            )}
          </p>
        ) : (
          <select
            id="brand"
            {...register("brand", { required: "Brand is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
          >
            <option value="">
              {getLocalizedText(
                { en: "Select Brand", ar: "اختر العلامة التجارية" },
                lang
              )}
            </option>
            {Array.isArray(allBrands) &&
              allBrands.map((brand) => (
                <option key={brand._id} value={brand._id}>
                  {brand.logoUrl ? "🖼️ " : ""}
                  {getLocalizedText(brand.name, lang)}
                </option>
              ))}
          </select>
        )}
        {errors.brand && (
          <p className="text-red-500 text-xs mt-1">{errors.brand.message}</p>
        )}
      </div>

      {/* Main Product Images */}
      <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          {getLocalizedText(
            { en: "Main Product Images", ar: "صور المنتج الرئيسية" },
            lang
          )}
        </h3>
        <input
          type="file"
          multiple
          onChange={handleMainImageUpload}
          accept="image/*,video/*"
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          disabled={uploadMutation.isPending}
        />
        {uploadMutation.isPending && (
          <p className="text-indigo-600 mt-2">
            {getLocalizedText(
              {
                en: "Uploading main images...",
                ar: "جاري تحميل الصور الرئيسية...",
              },
              lang
            )}
          </p>
        )}
        {uploadMutation.isError && (
          <p className="text-red-500 mt-2">
            {getLocalizedText(
              { en: "Error uploading:", ar: "خطأ في التحميل:" },
              lang
            )}{" "}
            {uploadMutation.error.message}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(watch("images") || []).map((img, index) =>
            renderMainImage(img, index)
          )}
        </div>
      </div>

      {/* Variants Section */}
      <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">
            {getLocalizedText(
              { en: "Product Variants", ar: "متغيرات المنتج" },
              lang
            )}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                appendVariant({ name: { en: "", ar: "" }, options: [] })
              }
              className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              {getLocalizedText(
                { en: "Add Variant Type", ar: "إضافة نوع متغير" },
                lang
              )}
            </button>
          </div>
        </div>

        {variantFields.map((variantType, variantTypeIndex) => (
          <div
            key={variantType.id}
            className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-700">
                {getLocalizedText(
                  { en: "Variant Type #", ar: "نوع المتغير #" },
                  lang
                )}
                {variantTypeIndex + 1}
              </h4>
              <button
                type="button"
                onClick={() => removeVariant(variantTypeIndex)}
                className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                {getLocalizedText({ en: "Remove", ar: "حذف" }, lang)}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {getLocalizedText(
                    {
                      en: "Variant Name (English)",
                      ar: "اسم المتغير (الإنجليزية)",
                    },
                    lang
                  )}
                </label>
                <input
                  {...register(`variants.${variantTypeIndex}.name.en`, {
                    required: getLocalizedText(
                      {
                        en: "Variant name is required",
                        ar: "اسم المتغير مطلوب",
                      },
                      lang
                    ),
                  })}
                  placeholder={getLocalizedText(
                    { en: "e.g., Configuration", ar: "مثال: التكوين" },
                    lang
                  )}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.variants?.[variantTypeIndex]?.name?.en && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.variants[variantTypeIndex].name.en.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {getLocalizedText(
                    {
                      en: "Variant Name (Arabic)",
                      ar: "اسم المتغير (العربية)",
                    },
                    lang
                  )}
                </label>
                <input
                  {...register(`variants.${variantTypeIndex}.name.ar`, {
                    required: getLocalizedText(
                      {
                        en: "Variant name is required",
                        ar: "اسم المتغير مطلوب",
                      },
                      lang
                    ),
                  })}
                  placeholder={getLocalizedText(
                    { en: "e.g., Configuration", ar: "مثال: التكوين" },
                    lang
                  )}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.variants?.[variantTypeIndex]?.name?.ar && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.variants[variantTypeIndex].name.ar.message}
                  </p>
                )}
              </div>
            </div>

            {/* Options for this variant type */}
            <div className="variant-options mb-4">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-base font-medium text-gray-700">
                  {getLocalizedText({ en: "Options", ar: "الخيارات" }, lang)}
                </h5>
              </div>
              <VariantOptionsFieldArray
                control={control}
                variantTypeIndex={variantTypeIndex}
                handleVariantImageUpload={handleVariantImageUpload}
                removeVariantImage={removeVariantImage}
                updateVariantImageAlt={updateVariantImageAlt}
                uploadMutation={uploadMutation}
                watch={watch}
                register={register}
                errors={errors}
                locale={lang}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Specifications Section */}
      <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          {getLocalizedText({ en: "Specifications", ar: "المواصفات" }, lang)}
        </h3>
        {specFields.map((spec, index) => (
          <div
            key={spec.id}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3 p-3 border border-gray-200 rounded-md bg-gray-50 items-end"
          >
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {getLocalizedText(
                  { en: "Spec Name (EN)", ar: "اسم المواصفة (الإنجليزية)" },
                  lang
                )}
              </label>
              <input
                {...register(`specifications.${index}.name.en`, {
                  required: "Spec name (EN) is required",
                })}
                placeholder={getLocalizedText(
                  { en: "e.g., Processor", ar: "مثال: المعالج" },
                  lang
                )}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
              {errors.specifications?.[index]?.name?.en && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.specifications[index].name.en.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {getLocalizedText(
                  { en: "Spec Name (AR)", ar: "اسم المواصفة (العربية)" },
                  lang
                )}
              </label>
              <input
                {...register(`specifications.${index}.name.ar`, {
                  required: "Spec name (AR) is required",
                })}
                placeholder={getLocalizedText(
                  { en: "e.g., Processor", ar: "مثال: المعالج" },
                  lang
                )}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
              {errors.specifications?.[index]?.name?.ar && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.specifications[index].name.ar.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {getLocalizedText(
                  { en: "Spec Value (EN)", ar: "قيمة المواصفة (الإنجليزية)" },
                  lang
                )}
              </label>
              <input
                {...register(`specifications.${index}.value.en`, {
                  required: "Spec value is required",
                })}
                placeholder="e.g., Snapdragon 8 Gen 3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
              {errors.specifications?.[index]?.value?.en && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.specifications[index].value.en.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                {getLocalizedText(
                  { en: "Spec Value (AR)", ar: "قيمة المواصفة (العربية)" },
                  lang
                )}
              </label>
              <input
                {...register(`specifications.${index}.value.ar`)}
                placeholder="مثال: سنابدراجون 8 الجيل 3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeSpec(index)}
                className="px-3 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            appendSpec({
              name: { en: "", ar: "" },
              value: { en: "", ar: "" },
            })
          }
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
        >
          {getLocalizedText(
            { en: "Add Specification", ar: "إضافة مواصفة" },
            lang
          )}
        </button>
      </div>

      {/* Checkboxes */}
      <div className="mb-6 flex gap-4">
        <label className="inline-flex items-center text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            {...register("isFeatured")}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="ml-2">
            {getLocalizedText(
              { en: "Featured Product", ar: "منتج مميز" },
              lang
            )}
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isFormSubmitting}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isFormSubmitting
          ? getLocalizedText({ en: "Saving...", ar: "جاري الحفظ..." }, lang)
          : getLocalizedText({ en: "Save Product", ar: "حفظ المنتج" }, lang)}
      </button>

      {/* Global Form Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <h4 className="font-bold">
            {getLocalizedText(
              {
                en: "Please correct the following errors:",
                ar: "يرجى تصحيح الأخطاء التالية:",
              },
              lang
            )}
          </h4>
          <ul className="list-disc list-inside mt-2">
            {Object.keys(errors).map((key) => {
              const error = errors[key];
              let message = error.message;
              if (
                !message &&
                typeof error === "object" &&
                !Array.isArray(error)
              ) {
                const nestedKeys = Object.keys(error);
                if (nestedKeys.length > 0) {
                  message = error[nestedKeys[0]].message || `Error in ${key}`;
                }
              }
              return <li key={key}>{message || `Error in ${key}`}</li>;
            })}
          </ul>
        </div>
      )}
    </form>
  );
};

const ImagePreview = ({ img, onRemove, onAltTextChange, lang }) => {
  if (!img || !img.url) return null;

  const altText = (img && typeof img.altText === "object" && img.altText) || {
    en: "",
    ar: "",
  };
  const isVideo = img.url.match(/\.(mp4|mov|avi)$/i);

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

  return (
    <div className="relative group overflow-hidden rounded-md shadow-sm border border-gray-200 w-32">
      {isVideo ? (
        <video
          src={img.url}
          controls
          className="w-full h-24 object-cover"
        ></video>
      ) : (
        <img
          src={img.url}
          alt={getLocalizedText(altText, lang)}
          className="w-full h-24 object-cover"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >
        &times;
      </button>
      <div className="p-1">
        <label className="block text-xs font-medium text-gray-600">
          Alt (EN)
        </label>
        <input
          type="text"
          value={altText.en || ""}
          onChange={(e) => onAltTextChange("en", e.target.value)}
          className="w-full text-xs p-1 border rounded"
        />
        <label className="block text-xs font-medium text-gray-600 mt-1">
          Alt (AR)
        </label>
        <input
          type="text"
          value={altText.ar || ""}
          onChange={(e) => onAltTextChange("ar", e.target.value)}
          className="w-full text-xs p-1 border rounded"
        />
      </div>
    </div>
  );
};

// --- Nested Component for Variant Options ---
const VariantOptionsFieldArray = ({
  control,
  variantTypeIndex,
  handleVariantImageUpload,
  removeVariantImage,
  updateVariantImageAlt,
  uploadMutation,
  watch,
  register,
  errors,
  locale,
}) => {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: `variants.${variantTypeIndex}.options`,
  });

  const watchOptionFields = watch(`variants.${variantTypeIndex}.options`) || [];

  return (
    <>
      {optionFields.map((option, optionIndex) => {
        // إذا لم يكن الخيار الأول، استخدم صور الخيار الأول
        const variantImages =
          optionIndex === 0
            ? watchOptionFields[optionIndex]?.variantImages || []
            : watchOptionFields[0]?.variantImages || [];

        return (
          <div
            key={option.id}
            className="mb-4 p-4 border border-gray-300 rounded-md bg-white shadow-sm"
          >
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-md font-medium text-gray-800">
                {getLocalizedText({ en: "Option #", ar: "الخيار #" }, locale)}
                {optionIndex + 1}
              </h5>
              <button
                type="button"
                onClick={() => removeOption(optionIndex)}
                className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                {getLocalizedText({ en: "Remove", ar: "حذف" }, locale)}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      {getLocalizedText(
                        {
                          en: "Option Value (EN)",
                          ar: "قيمة الخيار (إنجليزي)",
                        },
                        locale
                      )}
                    </label>
                    <input
                      {...register(
                        `variants.${variantTypeIndex}.options.${optionIndex}.value.en`,
                        {
                          required: getLocalizedText(
                            {
                              en: "Option value is required",
                              ar: "قيمة الخيار مطلوبة",
                            },
                            locale
                          ),
                        }
                      )}
                      placeholder={getLocalizedText(
                        { en: "e.g., Red - 256GB", ar: "مثال: أحمر - 256GB" },
                        locale
                      )}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.variants?.[variantTypeIndex]?.options?.[optionIndex]
                      ?.value?.en && (
                      <p className="text-red-500 text-xs mt-1">
                        {
                          errors.variants[variantTypeIndex].options[optionIndex]
                            .value.en.message
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      {getLocalizedText(
                        { en: "Option Value (AR)", ar: "قيمة الخيار (عربي)" },
                        locale
                      )}
                    </label>
                    <input
                      {...register(
                        `variants.${variantTypeIndex}.options.${optionIndex}.value.ar`,
                        {
                          required: getLocalizedText(
                            {
                              en: "Option value is required",
                              ar: "قيمة الخيار مطلوبة",
                            },
                            locale
                          ),
                        }
                      )}
                      placeholder={getLocalizedText(
                        { en: "e.g., Red - 256GB", ar: "مثال: أحمر - 256GB" },
                        locale
                      )}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {errors.variants?.[variantTypeIndex]?.options?.[optionIndex]
                      ?.value?.ar && (
                      <p className="text-red-500 text-xs mt-1">
                        {
                          errors.variants[variantTypeIndex].options[optionIndex]
                            .value.ar.message
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 col-span-2">
                {optionIndex === 0 && (
                  <>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        {getLocalizedText(
                          {
                            en: "Color Name (EN)",
                            ar: "اسم اللون (إنجليزي)",
                          },
                          locale
                        )}
                      </label>
                      <input
                        {...register(
                          `variants.${variantTypeIndex}.options.${optionIndex}.colorName.en`
                        )}
                        placeholder={getLocalizedText(
                          { en: "e.g., Space Gray", ar: "مثال: رمادي فلكي" },
                          locale
                        )}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        {getLocalizedText(
                          { en: "Color Name (AR)", ar: "اسم اللون (عربي)" },
                          locale
                        )}
                      </label>
                      <input
                        {...register(
                          `variants.${variantTypeIndex}.options.${optionIndex}.colorName.ar`
                        )}
                        placeholder={getLocalizedText(
                          { en: "e.g., Space Gray", ar: "مثال: رمادي فلكي" },
                          locale
                        )}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        {getLocalizedText(
                          { en: "Color Hex Code", ar: "رمز اللون" },
                          locale
                        )}
                      </label>
                      <Controller
                        name={`variants.${variantTypeIndex}.options.${optionIndex}.colorHex`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              {...field}
                              className="p-1 h-10 w-14 block bg-white border border-gray-300 cursor-pointer rounded-lg"
                            />
                            <input
                              type="text"
                              {...field}
                              placeholder="#FFFFFF"
                              className="block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* حقل SKU */}
              <div className="grid grid-cols-1 gap-4 col-span-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText(
                      { en: "SKU (Optional)", ar: "رمز المنتج SKU (اختياري)" },
                      locale
                    )}
                  </label>
                  <input
                    {...register(
                      `variants.${variantTypeIndex}.options.${optionIndex}.sku`
                    )}
                    placeholder={getLocalizedText(
                      { en: "e.g., SKU12345", ar: "مثال: SKU12345" },
                      locale
                    )}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 col-span-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText({ en: "Storage", ar: "التخزين" }, locale)}
                  </label>
                  <input
                    {...register(
                      `variants.${variantTypeIndex}.options.${optionIndex}.storage`
                    )}
                    placeholder={getLocalizedText(
                      { en: "e.g., 256GB", ar: "مثال: 256GB" },
                      locale
                    )}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText(
                      { en: "RAM", ar: "الذاكرة العشوائية" },
                      locale
                    )}
                  </label>
                  <input
                    {...register(
                      `variants.${variantTypeIndex}.options.${optionIndex}.ram`
                    )}
                    placeholder={getLocalizedText(
                      { en: "e.g., 8GB", ar: "مثال: 8GB" },
                      locale
                    )}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText({ en: "Price", ar: "السعر" }, locale)}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      step="0.01"
                      {...register(
                        `variants.${variantTypeIndex}.options.${optionIndex}.price`,
                        {
                          required: getLocalizedText(
                            { en: "Price is required", ar: "السعر مطلوب" },
                            locale
                          ),
                          valueAsNumber: true,
                          min: {
                            value: 0,
                            message: getLocalizedText(
                              {
                                en: "Price cannot be negative",
                                ar: "السعر لا يمكن أن يكون سالباً",
                              },
                              locale
                            ),
                          },
                        }
                      )}
                      placeholder="999.99"
                      className="block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText(
                      { en: "Discount (%)", ar: "الخصم (%)" },
                      locale
                    )}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      {...register(
                        `variants.${variantTypeIndex}.options.${optionIndex}.discount`,
                        { valueAsNumber: true }
                      )}
                      placeholder="10"
                      className="block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    {getLocalizedText({ en: "Stock", ar: "المخزون" }, locale)}
                  </label>
                  <input
                    type="number"
                    {...register(
                      `variants.${variantTypeIndex}.options.${optionIndex}.stock`,
                      {
                        required: getLocalizedText(
                          { en: "Stock is required", ar: "المخزون مطلوب" },
                          locale
                        ),
                        valueAsNumber: true,
                        min: {
                          value: 0,
                          message: getLocalizedText(
                            {
                              en: "Stock cannot be negative",
                              ar: "المخزون لا يمكن أن يكون سالباً",
                            },
                            locale
                          ),
                        },
                      }
                    )}
                    placeholder="100"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="mb-4">
                <h6 className="text-sm font-medium text-gray-700 mb-2">
                  {getLocalizedText(
                    { en: "Variant Images", ar: "صور المتغير" },
                    locale
                  )}
                </h6>
                <div className="flex items-center gap-4">
                  {optionIndex === 0 && (
                    <input
                      type="file"
                      multiple
                      onChange={(e) =>
                        handleVariantImageUpload(
                          e,
                          variantTypeIndex,
                          optionIndex
                        )
                      }
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      disabled={uploadMutation.isPending}
                    />
                  )}
                  {uploadMutation.isPending && (
                    <div className="flex items-center gap-2 text-indigo-600">
                      <svg
                        className="animate-spin h-5 w-5"
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
                      {getLocalizedText(
                        { en: "Uploading...", ar: "جاري الرفع..." },
                        locale
                      )}
                    </div>
                  )}
                </div>
                {uploadMutation.isError && (
                  <p className="text-red-500 mt-2">
                    {getLocalizedText(
                      { en: "Error uploading:", ar: "خطأ في الرفع:" },
                      locale
                    )}{" "}
                    {uploadMutation.error.message}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {variantImages.map((img, imgIndex) => (
                    <ImagePreview
                      key={img.public_id + imgIndex}
                      img={img}
                      index={imgIndex}
                      onRemove={() =>
                        removeVariantImage(
                          variantTypeIndex,
                          optionIndex,
                          img.public_id
                        )
                      }
                      onAltTextChange={(field, value) =>
                        updateVariantImageAlt(
                          variantTypeIndex,
                          optionIndex,
                          img.public_id,
                          field,
                          value
                        )
                      }
                      lang={locale}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          appendOption({
            storage: "",
            ram: "",
            price: 0,
            discount: 0,
            stock: 0,
            variantImages: [],
          })
        }
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
        {getLocalizedText({ en: "Add Option", ar: "إضافة خيار" }, locale)}
      </button>
    </>
  );
};

// TiptapEditor component for use with react-hook-form Controller
const TiptapEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content if value changes from outside (e.g., form reset)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  return (
    <div className="border rounded-md bg-white shadow-sm min-h-[120px] p-2">
      <EditorContent editor={editor} />
    </div>
  );
};

export default ProductCreationForm;
