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
import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

// Form validation schema
const productSchema = yup.object().shape({
  name: yup.string().required("Product name is required"),
  description: yup.string().required("Description is required"),
  category: yup.string().required("Category is required"),
  subCategory: yup.string(),
  subSubcategory: yup.string(),
  brand: yup.string().required("Brand is required"),
  specifications: yup.object(),
  variants: yup.array().of(
    yup.object().shape({
      color: yup.string().required("Color is required"),
      images: yup.array().of(yup.string()),
      storageOptions: yup.array().of(
        yup.object().shape({
          storage: yup.string().required("Storage is required"),
          price: yup
            .number()
            .required("Price is required")
            .min(0, "Price must be positive"),
          stock: yup
            .number()
            .required("Stock is required")
            .min(0, "Stock must be positive"),
          discount: yup
            .number()
            .min(0, "Discount must be positive")
            .max(100, "Discount cannot exceed 100%"),
        })
      ),
    })
  ),
});

export default function CreateProduct() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      name: "",
      description: "",
      category: "",
      subCategory: "",
      subSubcategory: "",
      brand: "",
      specifications: {},
      variants: [
        {
          color: "",
          images: [],
          storageOptions: [
            {
              storage: "",
              price: "",
              stock: "",
              discount: "",
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

  const selectedCategory = watch("category");
  const selectedSubcategory = watch("subCategory");
  const specifications = watch("specifications");

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

  const handleVariantImageChange = (index, files) => {
    const newImages = Array.from(files);
    const currentImages = watch(`variants.${index}.images`) || [];
    setValue(`variants.${index}.images`, [...currentImages, ...newImages]);
  };

  const removeVariantImage = (variantIndex, imageIndex) => {
    const currentImages = watch(`variants.${variantIndex}.images`) || [];
    const updatedImages = currentImages.filter((_, i) => i !== imageIndex);
    setValue(`variants.${variantIndex}.images`, updatedImages);
  };

  // Function to handle adding storage options to a specific variant
  const handleAddStorageOption = (variantIndex) => {
    const currentStorageOptions =
      watch(`variants.${variantIndex}.storageOptions`) || [];
    setValue(`variants.${variantIndex}.storageOptions`, [
      ...currentStorageOptions,
      {
        storage: "",
        price: "",
        stock: "",
        discount: "",
      },
    ]);
  };

  // Function to handle removing storage options from a specific variant
  const handleRemoveStorageOption = (variantIndex, optionIndex) => {
    const currentStorageOptions =
      watch(`variants.${variantIndex}.storageOptions`) || [];
    const updatedOptions = currentStorageOptions.filter(
      (_, index) => index !== optionIndex
    );
    setValue(`variants.${variantIndex}.storageOptions`, updatedOptions);
  };

  const addProduct = useMutation({
    mutationFn: async (formData) => {
      const response = await axios.post(`${base_url}/api/product`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      const productFormData = new FormData();

      // Add basic product information
      productFormData.append("name", data.name);
      productFormData.append("description", data.description);
      productFormData.append("category", data.category);

      if (data.subCategory) {
        productFormData.append("subCategory", data.subCategory);
      }
      if (data.subSubcategory) {
        productFormData.append("subSubcategory", data.subSubcategory);
      }
      if (data.brand) {
        productFormData.append("brand", data.brand);
      }

      // Add specifications
      productFormData.append(
        "specifications",
        JSON.stringify(data.specifications)
      );

      const processedVariants = data.variants.map(
        ({ color, storageOptions }) => ({
          color,
          storageOptions: storageOptions.map((option) => ({
            storage: option.storage,
            price: parseFloat(option.price) || 0,
            stock: parseInt(option.stock) || 0,
            discount: parseInt(option.discount) || 0,
          })),
        })
      );

      // Add variants as JSON
      productFormData.append("variants", JSON.stringify(processedVariants));

      // Add cover image
      if (coverImage) {
        productFormData.append("coverImage", coverImage);
      }

      // Add variant images and their counts
      const variantImageCounts = [];
      data.variants.forEach((variant, index) => {
        const images = watch(`variants.${index}.images`) || [];
        if (images.length > 0) {
          images.forEach((image) => {
            productFormData.append("variantImages", image);
          });
          variantImageCounts.push(images.length);
        } else {
          variantImageCounts.push(0);
        }
      });

      // Add variant image counts
      productFormData.append(
        "variantImageCounts",
        JSON.stringify(variantImageCounts)
      );

      // Make the API call
      await addProduct.mutateAsync(productFormData);

      // Success handling
      toast.success("Product created successfully!");
      navigate("/dashboard/products");
    } catch (error) {
      // Error handling
      toast.error(error.response?.data?.message || "Error creating product");
      console.error("Error creating product:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen rounded-2xl">
      <div className="">
        {/* Enhanced Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="group inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors mb-6"
          >
            <MoveLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back To Products</span>
          </button>
          <div className="rounded-2xl px-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Add New Product
                </h1>
                <p className="text-slate-600 mt-1">
                  Create and configure your product listing
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                Product Details
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Inventory Management
              </div>
              <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                Rich Media
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-black" />
                <h2 className="text-2xl font-bold text-black">
                  Basic Information
                </h2>
              </div>
              <p className="text-gray-400 mt-1">Essential product details</p>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Product Name *
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    placeholder="Enter an amazing product name"
                    className={`w-full px-4 py-3 border-2 ${
                      errors.name ? "border-red-500" : "border-slate-200"
                    } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80`}
                    required
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Product Description
                </label>
                <textarea
                  {...register("description")}
                  placeholder="Describe what makes this product special..."
                  rows={4}
                  className={`w-full px-4 py-3 border-2 ${
                    errors.description ? "border-red-500" : "border-slate-200"
                  } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 resize-none`}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Select */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Category *
                    </label>
                    <select
                      {...register("category")}
                      disabled={categoriesLoading}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.category ? "border-red-500" : "border-slate-200"
                      } rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-200 bg-white/80 disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">Select main category</option>
                      {!categoriesLoading &&
                        categories?.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
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
                      Subcategory
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
                      <option value="">Select subcategory</option>
                      {!categoriesLoading &&
                        currentCategory?.subcategories?.map((subcategory) => (
                          <option key={subcategory._id} value={subcategory._id}>
                            {subcategory.name}
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
                      Sub-subcategory
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
                      <option value="">Select sub-subcategory</option>
                      {!categoriesLoading &&
                        currentSubcategory?.subSubcategories?.map(
                          (subSubcategory) => (
                            <option
                              key={subSubcategory._id}
                              value={subSubcategory._id}
                            >
                              {subSubcategory.name}
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
                      Brand *
                    </label>
                    <select
                      {...register("brand")}
                      disabled={brandsLoading}
                      className={`w-full px-4 py-3 border-2 ${
                        errors.brand ? "border-red-500" : "border-slate-200"
                      } rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all duration-200 bg-white/80 disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">Select brand</option>
                      {!brandsLoading &&
                        brands?.map((brand) => (
                          <option key={brand._id} value={brand._id}>
                            {brand.name}
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
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">
                      Cover Image
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
                              src={URL.createObjectURL(coverImage)}
                              alt="Cover preview"
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
                              Upload Cover Image
                            </p>
                            <p className="text-sm text-slate-500">
                              PNG, JPG, WEBP up to 10MB
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
                    <h2 className="text-2xl font-bold">Product Variants</h2>
                    <p className="text-gray-400 mt-1">
                      Add different variations of your product
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    appendVariant({
                      color: "",
                      images: [],
                      storageOptions: [
                        {
                          storage: "",
                          price: "",
                          stock: "",
                          discount: "",
                        },
                      ],
                    })
                  }
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 cursor-pointer border border-gray-200 rounded-xl font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Variant
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-8">
                {variantFields.map((variant, index) => (
                  <div
                    key={variant.id}
                    className="p-6 border border-gray-200 rounded-xl space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">
                        Variant {index + 1}
                      </h3>
                      {variantFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-red-500" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                      <div className="space-y-2 w-1/2">
                        <label className="text-sm font-semibold text-slate-700">
                          Color *
                        </label>
                        <input
                          type="text"
                          {...register(`variants.${index}.color`)}
                          placeholder="e.g., Black, Silver"
                          className={`w-full px-4 py-3 border-2 ${
                            errors.variants?.[index]?.color
                              ? "border-red-500"
                              : "border-slate-200"
                          } rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200`}
                          required
                        />
                        {errors.variants?.[index]?.color && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.variants[index].color.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-700">
                            Storage Options
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleAddStorageOption(index)}
                            className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 cursor-pointer border border-gray-200 rounded-lg font-medium transition-colors flex items-center gap-2 backdrop-blur-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add Storage
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(
                            watch(`variants.${index}.storageOptions`) || []
                          ).map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-4 space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-medium text-slate-700">
                                  Storage Option {optionIndex + 1}
                                </h5>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveStorageOption(
                                      index,
                                      optionIndex
                                    )
                                  }
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                                >
                                  <X className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-slate-600">
                                    Storage Capacity
                                  </label>
                                  <input
                                    type="text"
                                    {...register(
                                      `variants.${index}.storageOptions.${optionIndex}.storage`
                                    )}
                                    placeholder="e.g., 128GB"
                                    className={`w-full px-3 py-2 border-2 ${
                                      errors.variants?.[index]
                                        ?.storageOptions?.[optionIndex]?.storage
                                        ? "border-red-500"
                                        : "border-gray-200"
                                    } rounded-lg transition-all duration-200 bg-white/80`}
                                  />
                                  {errors.variants?.[index]?.storageOptions?.[
                                    optionIndex
                                  ]?.storage && (
                                    <p className="text-red-500 text-xs">
                                      {
                                        errors.variants[index].storageOptions[
                                          optionIndex
                                        ].storage.message
                                      }
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-slate-600">
                                    Price
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      {...register(
                                        `variants.${index}.storageOptions.${optionIndex}.price`
                                      )}
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                      className={`w-full pl-8 pr-3 py-2 border-2 ${
                                        errors.variants?.[index]
                                          ?.storageOptions?.[optionIndex]?.price
                                          ? "border-red-500"
                                          : "border-gray-200"
                                      } rounded-lg transition-all duration-200 bg-white/80`}
                                    />
                                  </div>
                                  {errors.variants?.[index]?.storageOptions?.[
                                    optionIndex
                                  ]?.price && (
                                    <p className="text-red-500 text-xs">
                                      {
                                        errors.variants[index].storageOptions[
                                          optionIndex
                                        ].price.message
                                      }
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-slate-600">
                                    Stock
                                  </label>
                                  <input
                                    type="number"
                                    {...register(
                                      `variants.${index}.storageOptions.${optionIndex}.stock`
                                    )}
                                    placeholder="Available quantity"
                                    min="0"
                                    className={`w-full px-3 py-2 border-2 ${
                                      errors.variants?.[index]
                                        ?.storageOptions?.[optionIndex]?.stock
                                        ? "border-red-500"
                                        : "border-gray-200"
                                    } rounded-lg transition-all duration-200 bg-white/80`}
                                  />
                                  {errors.variants?.[index]?.storageOptions?.[
                                    optionIndex
                                  ]?.stock && (
                                    <p className="text-red-500 text-xs">
                                      {
                                        errors.variants[index].storageOptions[
                                          optionIndex
                                        ].stock.message
                                      }
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-slate-600">
                                    Discount (%)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      {...register(
                                        `variants.${index}.storageOptions.${optionIndex}.discount`
                                      )}
                                      placeholder="0"
                                      min="0"
                                      max="100"
                                      className={`w-full px-3 py-2 border-2 ${
                                        errors.variants?.[index]
                                          ?.storageOptions?.[optionIndex]
                                          ?.discount
                                          ? "border-red-500"
                                          : "border-gray-200"
                                      } rounded-lg transition-all duration-200 bg-white/80`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                      %
                                    </span>
                                  </div>
                                  {errors.variants?.[index]?.storageOptions?.[
                                    optionIndex
                                  ]?.discount && (
                                    <p className="text-red-500 text-xs">
                                      {
                                        errors.variants[index].storageOptions[
                                          optionIndex
                                        ].discount.message
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700">
                        Variant Images
                      </label>
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) =>
                            handleVariantImageChange(index, e.target.files)
                          }
                          className="hidden"
                          id={`variant-images-${index}`}
                        />
                        <label
                          htmlFor={`variant-images-${index}`}
                          className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-2xl p-8 text-center transition-all duration-300 group-hover:bg-purple-50"
                        >
                          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-200 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-purple-600" />
                          </div>
                          <p className="font-medium text-slate-700 mb-1">
                            Upload Variant Images
                          </p>
                          <p className="text-sm text-slate-500">
                            Multiple images supported
                          </p>
                        </label>
                      </div>

                      {watch(`variants.${index}.images`)?.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                          {watch(`variants.${index}.images`).map(
                            (image, imgIndex) => (
                              <div key={imgIndex} className="relative group">
                                <img
                                  src={URL.createObjectURL(image)}
                                  alt={`Variant ${index + 1} image ${
                                    imgIndex + 1
                                  }`}
                                  className="w-full h-26 object-contain rounded-lg bg-gray-50"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeVariantImage(index, imgIndex)
                                  }
                                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}
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
                  <h2 className="text-2xl font-bold">Product Specifications</h2>
                  <p className="text-gray-400 mt-1">
                    Technical details and features
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-4">
                {Object.entries(specifications || {}).map(
                  ([key, value], index) => (
                    <div
                      key={index}
                      className="flex gap-4 items-center p-4 border-gray-300 bg-gray-50 rounded-xl border"
                    >
                      <input
                        type="text"
                        placeholder="Specification name"
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          if (newKey === key) return; // Don't update if key hasn't changed

                          // Check if the new key already exists (excluding the current key)
                          const otherKeys = Object.keys(
                            specifications || {}
                          ).filter((k) => k !== key);
                          if (otherKeys.includes(newKey)) {
                            toast.error(
                              "This specification name already exists"
                            );
                            return;
                          }

                          const newSpecs = { ...specifications };
                          const currentValue = newSpecs[key];
                          delete newSpecs[key];
                          newSpecs[newKey] = currentValue;
                          setValue("specifications", newSpecs);
                        }}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 bg-white/80"
                      />
                      <input
                        type="text"
                        placeholder="Specification value"
                        value={value}
                        onChange={(e) => {
                          setValue("specifications", {
                            ...specifications,
                            [key]: e.target.value,
                          });
                        }}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl transition-all duration-200 bg-white/80"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newSpecs = { ...specifications };
                          delete newSpecs[key];
                          setValue("specifications", newSpecs);
                        }}
                        className="p-3 hover:bg-red-100 rounded-xl transition-colors group"
                      >
                        <X className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                      </button>
                    </div>
                  )
                )}
                <button
                  type="button"
                  onClick={() => {
                    setValue("specifications", { ...specifications, "": "" });
                  }}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Specification
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Product...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Create Product
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
