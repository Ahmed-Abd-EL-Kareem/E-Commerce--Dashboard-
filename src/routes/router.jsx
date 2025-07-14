import { createBrowserRouter, Navigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import OrdersPage from "../pages/orders/OrdersPage";
import ProductsPage from "../pages/products/ProductsPage";
import ProductPreviewPage from "../pages/products/ProductPreviewPage";
import CustomersPage from "../pages/customers/CustomersPage";
import CategoriesPage from "../pages/categories/CategoriesPage";
import BrandsPage from "../pages/brands/BrandsPage";
import LoginPage from "../pages/auth/Login";
import ProtectedRoute from "../components/ProtectedRoute";
import SignUp from "../pages/auth/SignUp";
import CustomerLayout from "../layouts/CustomerLayout";
import Main from "../pages/CustomerPages/main/Main";
import CreateProduct from "../pages/createProduct/CreateProduct";
import EditProductPage from "../pages/products/EditProductPage";
import CartPage from "../pages/cart/cart";
import ProductCreationForm from "../pages/createProduct/CreateProductV2";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute role="admin">
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "products", element: <ProductsPage /> },
      // { path: "products/create", element: <CreateProduct /> },
      { path: "products/create", element: <ProductCreationForm /> },
      { path: "products/preview/:id", element: <ProductPreviewPage /> },
      { path: "products/edit/:id", element: <EditProductPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "brands", element: <BrandsPage /> },
    ],
  },
  {
    path: "/",
    element: (
      <ProtectedRoute role="user">
        <CustomerLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <Main /> }],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignUp />,
  },
]);

export default router;
