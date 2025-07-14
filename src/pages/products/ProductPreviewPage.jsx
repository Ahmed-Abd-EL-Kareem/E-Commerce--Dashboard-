import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { base_url } from "../../constants/axiosConfig";
import Badge from "../../components/Badge";
import {
  FiArrowLeft,
  FiX,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

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

const ImageModal = ({ image, onClose, allImages, currentImageIndex }) => {
  const modalRef = useRef(null);

  const handlePrevious = (e) => {
    e.stopPropagation();
    if (currentImageIndex > 0) {
      onClose(allImages[currentImageIndex - 1], currentImageIndex - 1);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (currentImageIndex < allImages.length - 1) {
      onClose(allImages[currentImageIndex + 1], currentImageIndex + 1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose(null);
      } else if (event.key === "ArrowLeft") {
        handlePrevious(event);
      } else if (event.key === "ArrowRight") {
        handleNext(event);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentImageIndex, allImages, onClose]);

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center h-full bg-white/90">
      <button
        onClick={() => onClose(null)}
        className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors z-10"
        aria-label="Close modal"
      >
        <FiX className="w-6 h-6 text-gray-600" />
      </button>
      <div ref={modalRef} className="relative max-w-4xl h-screen p-4">
        <img
          src={image}
          alt="Product preview"
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />

        {/* Image Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 px-4 py-2 rounded-full shadow-lg text-sm text-gray-600">
          {currentImageIndex + 1} / {allImages.length}
        </div>
      </div>
    </div>
  );
};

const ProductPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  const fetchProduct = async () => {
    const response = await axios.get(`${base_url}/api/product/${id}`);
    return response.data.data;
  };

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: fetchProduct,
  });

  const getAllImages = () => {
    if (!product) return [];
    const images = [];

    // Add main product images
    product.images?.forEach((img) => {
      if (img?.url) images.push(img.url);
    });

    // Add variant images
    product.variants?.forEach((variant) => {
      variant.options?.forEach((option) => {
        option.variantImages?.forEach((img) => {
          if (img?.url && !images.includes(img.url)) {
            images.push(img.url);
          }
        });
      });
    });

    return images;
  };

  const handleImageClick = (image) => {
    const allImages = getAllImages();
    const index = allImages.indexOf(image);
    setSelectedImage(image);
    setCurrentImageIndex(index);
  };

  const handleCloseModal = (newImage = null, newIndex = 0) => {
    if (newImage) {
      setSelectedImage(newImage);
      setCurrentImageIndex(newIndex);
    } else {
      setSelectedImage(null);
      setCurrentImageIndex(0);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-500">
        <p>Error loading product: {error.message}</p>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Image Modal */}
      <ImageModal
        image={selectedImage}
        onClose={handleCloseModal}
        allImages={getAllImages()}
        currentImageIndex={currentImageIndex}
      />

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <FiArrowLeft className="w-5 h-5" />
        {getLocalizedText(
          { en: "Back to Products", ar: "العودة إلى المنتجات" },
          lang
        )}
      </button>

      {/* Header with Image and Basic Info */}
      <div className="flex gap-6">
        <div className="w-1/3">
          <img
            src={product.images?.[0]?.url || ""}
            alt={getLocalizedText(
              product.name,
              lang,
              getLocalizedText({ en: "Product image", ar: "صورة المنتج" }, lang)
            )}
            className="w-64 h-64 object-fill rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => handleImageClick(product.images?.[0]?.url)}
          />

          {/* Additional product images */}
          <div className="flex flex-wrap gap-2 mt-4">
            {product.images?.slice(1).map?.((img, index) => (
              <img
                key={index}
                src={img.url || ""}
                alt={`${getLocalizedText(
                  { en: "Product thumbnail", ar: "صورة مصغرة للمنتج" },
                  lang
                )} ${index + 1}`}
                className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
                onClick={() => handleImageClick(img.url)}
              />
            ))}
          </div>
        </div>
        <div className="w-2/3 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {getLocalizedText(
              product.name,
              lang,
              getLocalizedText(
                { en: "Unnamed Product", ar: "منتج بدون اسم" },
                lang
              )
            )}
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant={product.totalStock > 0 ? "success" : "error"}>
              {product.totalStock > 0
                ? getLocalizedText({ en: "In Stock", ar: "متوفر" }, lang)
                : getLocalizedText(
                    { en: "Out of Stock", ar: "نفذ المخزون" },
                    lang
                  )}
            </Badge>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">
              {getLocalizedText(
                { en: "Total Stock:", ar: "إجمالي المخزون:" },
                lang
              )}{" "}
              {product.totalStock || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">
              {getLocalizedText({ en: "Category:", ar: "الفئة:" }, lang)}
            </span>
            {getLocalizedText(product.category?.name, lang) ? (
              <span className="font-medium">
                {getLocalizedText(product.category.name, lang)}
              </span>
            ) : null}
            {getLocalizedText(product.subCategory?.name, lang) ? (
              <>
                <span className="text-gray-500">•</span>
                <span className="font-medium">
                  {getLocalizedText(product.subCategory.name, lang)}
                </span>
              </>
            ) : null}
            {getLocalizedText(product.subSubcategory?.name, lang) ? (
              <>
                <span className="text-gray-500">•</span>
                <span className="font-medium">
                  {getLocalizedText(product.subSubcategory.name, lang)}
                </span>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">
              {getLocalizedText(
                { en: "Brand:", ar: "العلامة التجارية:" },
                lang
              )}
            </span>
            <span className="font-medium">
              {getLocalizedText(
                product.brand?.name,
                lang,
                getLocalizedText({ en: "Unknown", ar: "غير معروف" }, lang)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Price Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">
          {getLocalizedText(
            { en: "Price Information", ar: "معلومات السعر" },
            lang
          )}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600">
              {getLocalizedText(
                { en: "Base Price:", ar: "السعر الأساسي:" },
                lang
              )}
            </span>
            <span className="ml-2 font-medium">
              ${(product.basePrice || 0).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">
              {getLocalizedText(
                { en: "Best Price After Discount:", ar: "أفضل سعر بعد الخصم:" },
                lang
              )}
            </span>
            <span className="ml-2 font-medium">
              ${(product.bestPriceAfterDiscount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {getLocalizedText(
            { en: "Product Variants", ar: "متغيرات المنتج" },
            lang
          )}
        </h3>
        {product.variants?.flatMap((variant, variantIndex) =>
          variant.options?.map?.((option, optionIndex) => (
            <div
              key={`${variantIndex}-${optionIndex}`}
              className="border-2 bg-white border-gray-300 rounded-lg p-4"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14">
                  <img
                    src={option.variantImages?.[0]?.url || ""}
                    alt={getLocalizedText(
                      option.colorName,
                      lang,
                      getLocalizedText(
                        { en: "Variant image", ar: "صورة المتغير" },
                        lang
                      )
                    )}
                    className="w-full h-full object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() =>
                      handleImageClick(option.variantImages?.[0]?.url)
                    }
                  />
                </div>
                <div>
                  <h4 className="font-medium">
                    {getLocalizedText({ en: "Color:", ar: "اللون:" }, lang)}{" "}
                    {getLocalizedText(
                      option.colorName,
                      lang,
                      getLocalizedText(
                        { en: "No color specified", ar: "لم يتم تحديد لون" },
                        lang
                      )
                    )}
                  </h4>
                  <div className="flex gap-2 mt-1">
                    {option.variantImages?.map?.((img, imgIndex) => (
                      <img
                        key={imgIndex}
                        src={img.url || ""}
                        alt={`${getLocalizedText(
                          option.colorName,
                          lang,
                          getLocalizedText({ en: "Variant", ar: "متغير" }, lang)
                        )} ${imgIndex + 1}`}
                        className="w-8 h-8 object-contain rounded cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => handleImageClick(img.url)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div>
                    {option.storage && (
                      <span className="font-medium">{option.storage}</span>
                    )}
                    <span className="text-gray-500 ml-2">
                      ({getLocalizedText({ en: "SKU:", ar: "الرمز:" }, lang)}{" "}
                      {option.sku ||
                        getLocalizedText(
                          { en: "No SKU", ar: "لا يوجد رمز" },
                          lang
                        )}
                      )
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500 line-through">
                        ${(option.price || 0).toFixed(2)}
                      </div>
                      <div className="font-medium text-green-600">
                        ${(option.priceAfterDiscount || 0).toFixed(2)}
                      </div>
                    </div>
                    <Badge variant={option.stock > 0 ? "success" : "error"}>
                      {getLocalizedText({ en: "Stock:", ar: "المخزون:" }, lang)}{" "}
                      {option.stock || 0}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Specifications */}
      {product.specifications?.length > 0 && (
        <div className="space-y-4 bg-white p-3 rounded-md border-2 border-gray-300">
          <h3 className="text-lg font-semibold">
            {getLocalizedText({ en: "Specifications", ar: "المواصفات" }, lang)}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {product.specifications.map((spec, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded">
                <span className="text-gray-600">
                  {getLocalizedText(
                    spec.name,
                    lang,
                    getLocalizedText(
                      { en: "Specification", ar: "مواصفة" },
                      lang
                    )
                  )}
                  :
                </span>
                <span className="ml-2 font-medium">
                  {getLocalizedText(
                    spec.value,
                    lang,
                    getLocalizedText({ en: "N/A", ar: "غير متاح" }, lang)
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2 bg-white p-3 rounded-md border-2 border-gray-300">
        <h3 className="text-lg font-semibold">
          {getLocalizedText({ en: "Description", ar: "الوصف" }, lang)}
        </h3>
        <div
          className="text-gray-600"
          dangerouslySetInnerHTML={{
            __html: getLocalizedText(
              product.details,
              lang,
              getLocalizedText(
                { en: "No description available", ar: "لا يوجد وصف متاح" },
                lang
              )
            ),
          }}
        />
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-3 gap-4 text-sm text-gray-500 bg-white p-3 rounded-md border-2 border-gray-300">
        <div>
          {getLocalizedText({ en: "Created:", ar: "تم إنشاؤه:" }, lang)}{" "}
          {product.createdAt
            ? new Date(product.createdAt).toLocaleDateString()
            : getLocalizedText({ en: "N/A", ar: "غير متاح" }, lang)}
        </div>
        <div>
          {getLocalizedText({ en: "Views:", ar: "المشاهدات:" }, lang)}{" "}
          {product.views || 0}
        </div>
        <div>
          {getLocalizedText({ en: "Sold:", ar: "تم بيعه:" }, lang)}{" "}
          {product.sold || 0}
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewPage;
