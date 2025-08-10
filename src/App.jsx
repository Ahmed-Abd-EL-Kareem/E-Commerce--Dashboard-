import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import router from "./routes/router";
import LanguageSwitcher from "./components/LanguageSwitcher";

const queryClient = new QueryClient();

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* Language Switcher - positioned at top right */}
          <div className="fixed top-4 right-4 z-50">
            <LanguageSwitcher />
          </div>
          
          {/* <AppRoutes /> */}
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
