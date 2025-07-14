import React, { useState } from "react";
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Menu,
  X,
  ChevronDown,
  Smartphone,
  Laptop,
  Headphones,
  Camera,
  Gamepad2,
  Tv,
  Watch,
  Speaker,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation";

export default function Navbar() {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [cartCount] = useState(3);

  const categories = [
    {
      name: t('categories.smartphones'),
      icon: Smartphone,
      color: "text-blue-500",
      subcategories: [
        t('categories.iphone'),
        t('categories.samsung'),
        t('categories.googlePixel'),
        t('categories.onePlus'),
        t('categories.xiaomi'),
        t('categories.accessories'),
      ],
    },
    {
      name: t('categories.laptops'),
      icon: Laptop,
      color: "text-green-500",
      subcategories: [
        t('categories.macbook'),
        t('categories.windowsLaptops'),
        t('categories.gamingLaptops'),
        t('categories.businessLaptops'),
        t('categories.accessories'),
      ],
    },
    {
      name: t('categories.audio'),
      icon: Headphones,
      color: "text-purple-500",
      subcategories: [
        t('categories.headphones'),
        t('categories.earbuds'),
        t('categories.speakers'),
        t('categories.soundSystems'),
        t('categories.accessories'),
      ],
    },
    {
      name: t('categories.cameras'),
      icon: Camera,
      color: "text-red-500",
      subcategories: [
        t('categories.dslr'),
        t('categories.mirrorless'),
        t('categories.actionCameras'),
        t('categories.lenses'),
        t('categories.accessories'),
      ],
    },
    {
      name: t('categories.gaming'),
      icon: Gamepad2,
      color: "text-orange-500",
      subcategories: [
        t('categories.gamingConsoles'),
        t('categories.gamingPCs'),
        t('categories.gamingAccessories'),
        t('categories.gamingChairs'),
        t('categories.games'),
      ],
    },
    {
      name: t('categories.tvHome'),
      icon: Tv,
      color: "text-indigo-500",
      subcategories: [
        t('categories.smartTVs'),
        t('categories.homeTheater'),
        t('categories.streamingDevices'),
        t('categories.tvAccessories'),
      ],
    },
    {
      name: t('categories.wearables'),
      icon: Watch,
      color: "text-pink-500",
      subcategories: [
        t('categories.smartwatches'),
        t('categories.fitnessTrackers'),
        t('categories.smartRings'),
        t('categories.accessories'),
      ],
    },
    {
      name: t('categories.speakers'),
      icon: Speaker,
      color: "text-teal-500",
      subcategories: [
        t('categories.bluetoothSpeakers'),
        t('categories.smartSpeakers'),
        t('categories.homeAudio'),
        t('categories.portableSpeakers'),
      ],
    },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    // Add your search logic here
    console.log("Searching for:", searchQuery);
  };

  return (
    <div className="bg-base-100 shadow-lg sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-primary text-primary-content">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-2 text-sm">
            <div className="hidden md:flex space-x-6">
              <span>{t('navbar.freeShipping')}</span>
              <span>•</span>
              <span>{t('navbar.customerSupport')}</span>
            </div>
            <div className="flex space-x-4">
              <a
                href="#"
                className="hover:text-primary-focus transition-colors"
              >
                {t('navbar.trackOrder')}
              </a>
              <a
                href="#"
                className="hover:text-primary-focus transition-colors"
              >
                {t('navbar.help')}
              </a>
              <a
                href="#"
                className="hover:text-primary-focus transition-colors"
              >
                {t('auth.signIn')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="">
            <div className="dropdown lg:hidden">
              <label
                tabIndex={0}
                className="btn btn-ghost btn-circle"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </label>
            </div>
            <Link
              to={"/"}
              className="text-2xl font-bold text-primary ml-2 lg:ml-0 hover:opacity-80 transition-opacity"
            >
              Alalamia
            </Link>
          </div>

          {/* Search Bar */}
          <div className=" hidden lg:flex flex-1 max-w-4xl">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <div
                  className={`flex items-center rounded-full border-2 transition-all duration-200 ${
                    isSearchFocused
                      ? "border-primary shadow-lg"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="text"
                    placeholder={t('navbar.searchPlaceholder')}
                    className="flex-1 px-6 py-3 rounded-l-full focus:outline-none text-gray-700 bg-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-primary text-white rounded-r-full hover:bg-primary-focus transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Search size={20} />
                    <span className="hidden sm:inline">{t('common.search')}</span>
                  </button>
                </div>
                {searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">{t('navbar.popularSearches')}</p>
                      <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors">
                          {t('products.iphone15')}
                        </button>
                        <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors">
                          {t('products.macbookPro')}
                        </button>
                        <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors">
                          {t('products.airpodsPro')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Right Side Icons */}
          <div className="">
            <div className="flex items-center space-x-2">
              {/* Mobile Search */}
              <div className="dropdown dropdown-end lg:hidden">
                <label
                  tabIndex={0}
                  className="btn btn-ghost btn-circle hover:bg-base-200 transition-colors"
                >
                  <Search size={20} />
                </label>
                <div
                  tabIndex={0}
                  className="dropdown-content mt-3 w-80 p-4 shadow bg-base-100 rounded-box"
                >
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <div className="flex items-center w-full rounded-full border-2 border-gray-200 focus-within:border-primary focus-within:shadow-lg transition-all duration-200">
                        <input
                          type="text"
                          placeholder={t('common.search')}
                          className="w-full px-4 py-2 rounded-l-full focus:outline-none text-gray-700 bg-transparent"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary text-white rounded-r-full hover:bg-primary-focus transition-colors duration-200"
                        >
                          <Search size={16} />
                        </button>
                      </div>
                      {searchQuery && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500">
                              {t('navbar.popularSearches')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors">
                                {t('products.iphone15')}
                              </button>
                              <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors">
                                {t('products.macbookPro')}
                              </button>
                              <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors">
                                {t('products.airpodsPro')}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Wishlist */}
              <button className="btn btn-ghost btn-circle hover:bg-base-200 transition-colors">
                <Heart size={20} />
              </button>

              {/* User Account */}
              <div className="dropdown dropdown-end">
                <label
                  tabIndex={0}
                  className="btn btn-ghost btn-circle hover:bg-base-200 transition-colors"
                >
                  <User size={20} />
                </label>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mt-3"
                >
                  <li>
                    <a className="hover:bg-base-200 transition-colors">
                      My Account
                    </a>
                  </li>
                  <li>
                    <a className="hover:bg-base-200 transition-colors">
                      Orders
                    </a>
                  </li>
                  <li>
                    <a className="hover:bg-base-200 transition-colors">
                      Wishlist
                    </a>
                  </li>
                  <li>
                    <a className="hover:bg-base-200 transition-colors">
                      Settings
                    </a>
                  </li>
                  <li>
                    <hr className="my-2" />
                  </li>
                  <li>
                    <a className="hover:bg-base-200 transition-colors text-red-500">
                      Sign Out
                    </a>
                  </li>
                </ul>
              </div>

              {/* Shopping Cart */}
              <div className="dropdown dropdown-end">
                <label
                  tabIndex={0}
                  className="btn btn-ghost btn-circle hover:bg-base-200 transition-colors"
                >
                  <div className="indicator">
                    <ShoppingCart size={20} />
                    {cartCount > 0 && (
                      <span className="badge badge-sm badge-primary indicator-item">
                        {cartCount}
                      </span>
                    )}
                  </div>
                </label>
                <div
                  tabIndex={0}
                  className="dropdown-content mt-3 w-80 p-4 shadow bg-base-100 rounded-box"
                >
                  <h3 className="font-semibold text-lg mb-3">Shopping Cart</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-2 hover:bg-base-200 rounded-lg transition-colors">
                      <div className="w-12 h-12 bg-gray-200 rounded"></div>
                      <div className="flex-1">
                        <p className="font-medium">iPhone 15 Pro</p>
                        <p className="text-sm text-gray-500">$999.00</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-2 hover:bg-base-200 rounded-lg transition-colors">
                      <div className="w-12 h-12 bg-gray-200 rounded"></div>
                      <div className="flex-1">
                        <p className="font-medium">MacBook Air</p>
                        <p className="text-sm text-gray-500">$1,199.00</p>
                      </div>
                    </div>
                  </div>
                  <div className="divider"></div>
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total: $2,198.00</span>
                  </div>
                  <button className="btn btn-primary w-full mt-3 hover:bg-primary-focus transition-colors">
                    View Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Navigation */}
      <div className="bg-base-200 border-t border-gray-300">
        <div className="container mx-auto px-4">
          <div className="hidden lg:flex items-center py-3 space-x-8">
            <div className="dropdown dropdown-hover">
              <label
                tabIndex={0}
                className="btn btn-ghost normal-case hover:bg-base-300 transition-colors"
              >
                All Categories
                <ChevronDown size={16} className="ml-1" />
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-64 mt-1"
              >
                {categories.map((category, index) => {
                  const IconComponent = category.icon;
                  return (
                    <li key={index} className="group">
                      <a className="flex items-center justify-between hover:bg-base-200 transition-colors">
                        <div className="flex items-center space-x-3">
                          <IconComponent size={18} className={category.color} />
                          <span>{category.name}</span>
                        </div>
                        <ChevronRight
                          size={16}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </a>
                      <ul className="hidden group-hover:block absolute left-full top-0 w-48 bg-base-100 shadow-lg rounded-box p-2">
                        {category.subcategories.map((subcat, subIndex) => (
                          <li key={subIndex}>
                            <a className="hover:bg-base-200 transition-colors px-4 py-2 rounded-lg">
                              {subcat}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>

            {categories.slice(0, 6).map((category, index) => {
              const IconComponent = category.icon;
              return (
                <div key={index} className="group relative">
                  <a
                    href="#"
                    className="flex items-center space-x-2 hover:text-primary transition-colors"
                  >
                    <IconComponent size={16} className={category.color} />
                    <span>{category.name}</span>
                  </a>
                  <ul className="hidden group-hover:block absolute top-full left-0 w-48 bg-base-100 shadow-lg rounded-box p-2 mt-1">
                    {category.subcategories.map((subcat, subIndex) => (
                      <li key={subIndex}>
                        <a className="hover:bg-base-200 transition-colors px-4 py-2 rounded-lg block">
                          {subcat}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            <a
              href="#"
              className="text-secondary font-medium hover:text-secondary-focus transition-colors"
            >
              Deals
            </a>
            <a
              href="#"
              className="text-red-500 font-medium hover:text-red-600 transition-colors"
            >
              Sale
            </a>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-base-100 border-t">
          <div className="container mx-auto px-4 py-4">
            <div className="space-y-4">
              {categories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <div key={index} className="space-y-2">
                    <a
                      href="#"
                      className="flex items-center space-x-3 p-2 hover:bg-base-200 rounded-lg transition-colors"
                    >
                      <IconComponent size={18} className={category.color} />
                      <span>{category.name}</span>
                    </a>
                    <div className="pl-8 space-y-1">
                      {category.subcategories.map((subcat, subIndex) => (
                        <a
                          key={subIndex}
                          href="#"
                          className="block p-2 text-sm hover:bg-base-200 rounded-lg transition-colors"
                        >
                          {subcat}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="divider"></div>
              <a
                href="#"
                className="block p-2 text-secondary font-medium hover:bg-base-200 rounded-lg transition-colors"
              >
                Deals
              </a>
              <a
                href="#"
                className="block p-2 text-red-500 font-medium hover:bg-base-200 rounded-lg transition-colors"
              >
                Sale
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
