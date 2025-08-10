import React from "react";
import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiShoppingCart,
  FiPackage,
  FiUsers,
  FiSettings,
  FiTag,
  FiGrid,
  FiLogOut,
} from "react-icons/fi";
import { PiShoppingBag } from "react-icons/pi";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: FiHome },
  { name: "Categories", href: "/dashboard/categories", icon: FiGrid },
  { name: "Brands", href: "/dashboard/brands", icon: FiTag },
  { name: "Products", href: "/dashboard/products", icon: FiPackage },
  { name: "Orders", href: "/dashboard/orders", icon: PiShoppingBag },
  { name: "Cart", href: "/dashboard/cart", icon: FiShoppingCart },
  { name: "Customers", href: "/dashboard/customers", icon: FiUsers },
];
import { useTranslation } from "../hooks/useTranslation";

const DashboardLayout = () => {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: t("dashboard.dashboard"), href: "/dashboard", icon: FiHome },
    {
      name: t("dashboard.orders"),
      href: "/dashboard/orders",
      icon: FiShoppingCart,
    },
    {
      name: t("dashboard.cart"),
      href: "/dashboard/cart",
      icon: FiShoppingCart,
    },
    {
      name: t("dashboard.products"),
      href: "/dashboard/products",
      icon: FiPackage,
    },
    {
      name: t("dashboard.categories"),
      href: "/dashboard/categories",
      icon: FiGrid,
    },
    { name: t("dashboard.brands"), href: "/dashboard/brands", icon: FiTag },
    {
      name: t("dashboard.customers"),
      href: "/dashboard/customers",
      icon: FiUsers,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 ">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div
          className="fixed inset-0 bg-gray-600/70"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-semibold text-gray-900 ">
              {t("dashboard.title")}
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-600 "
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? "bg-primary-100 text-primary-900 "
                      : "text-gray-600 hover:bg-gray-50 "
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 flex-shrink-0 ${
                      isActive
                        ? "text-primary-500"
                        : "text-gray-400 group-hover:text-gray-500 "
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
                  {user?.name?.[0] || "U"}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 ">
                  {user?.name}
                </p>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-gray-700 "
                >
                  {t("dashboard.signOut")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200  bg-white ">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-semibold text-gray-900 ">
              {t("dashboard.title")}
            </h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? "bg-primary-100 text-primary-900 "
                      : "text-gray-600 hover:bg-gray-50 "
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 flex-shrink-0 ${
                      isActive
                        ? "text-primary-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                  {user?.firstName?.[0] || "U"}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 ">
                  {user?.firstName} {user?.lastName}
                </p>
                <button
                  onClick={logout}
                  className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer flex items-center gap-2"
                >
                  <FiLogOut />
                  {t("dashboard.signOut")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
          <button
            type="button"
            className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              <h2 className="text-2xl font-semibold text-gray-900 my-auto">
                {navigation.find((item) => item.href === location.pathname)
                  ?.name || t("dashboard.dashboard")}
              </h2>
            </div>
          </div>
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
