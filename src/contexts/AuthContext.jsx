import axios from "axios";
import {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
} from "react";
// import { useNavigate } from "react-router";
import { jwtDecode } from "jwt-decode";
import { base_url } from "../constants/axiosConfig";

const AuthContext = createContext(null);

const initalState = {
  user: null,
  isAuthenticated: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "LOGIN":
      return { ...state, user: action.payload, isAuthenticated: true };
    case "LOGOUT":
      return { ...state, user: null, isAuthenticated: false };
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errors, setErrors] = useState(null);

  const [{ user, isAuthenticated }, dispatch] = useReducer(
    reducer,
    initalState
  );

  const isTokenValid = (token) => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (token && isTokenValid(token)) {
        try {
          const user = jwtDecode(token);
          // Add axios default header
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          dispatch({ type: "LOGIN", payload: user });
        } catch (err) {
          console.error(err);
          localStorage.removeItem("token");
          delete axios.defaults.headers.common["Authorization"];
        }
      } else {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
      }
      setCheckingAuth(false);
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (data) => {
    try {
      setLoading(true);
      const response = await axios.post(`${base_url}/api/auth/login`, data, {
        withCredentials: true,
      });

      const { token } = response.data;
      if (!isTokenValid(token)) throw new Error("Invalid token received");

      localStorage.setItem("token", token);
      // Add axios default header after login
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const user = jwtDecode(token);

      dispatch({ type: "LOGIN", payload: user });
      return { success: true, user };
    } catch (error) {
      setErrors(error.response?.data?.error.message || "Login failed");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        `${base_url}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      localStorage.removeItem("token");
      dispatch({ type: "LOGOUT" });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated,
        errors,
        checkingAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
