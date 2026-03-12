// Register.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Logo from "../assets/logo.svg";
import { registerRoute } from "../utils/APIRoutes";

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toastOptions = {
    position: "bottom-right",
    autoClose: 5000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };

  useEffect(() => {
    if (localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)) {
      navigate("/");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleValidation = () => {
    const { password, confirmPassword, username, email } = values;

    if (password !== confirmPassword) {
      toast.error("Passwords don't match", toastOptions);
      return false;
    }
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters", toastOptions);
      return false;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters", toastOptions);
      return false;
    }
    if (!email.trim()) {
      toast.error("Email is required", toastOptions);
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email", toastOptions);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!handleValidation()) return;

    setIsSubmitting(true);

    try {
      const { username, email, password } = values;

      const { data } = await axios.post(registerRoute, {
        username,
        email,
        password,
      });

      if (!data.status) {
        toast.error(data.msg || "Registration failed", toastOptions);
      } else {
        localStorage.setItem(
          process.env.REACT_APP_LOCALHOST_KEY,
          JSON.stringify(data.user)
        );
        toast.success("Account created! Welcome 🎉", toastOptions);
        navigate("/");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        error.response?.data?.msg || "Something went wrong",
        toastOptions
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-gray-950 via-indigo-950/60 to-purple-950/40 overflow-hidden">

      {/* Decorative background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl animate-blob-slow" />
        <div className="absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="
        relative z-10 w-full max-w-lg
        bg-gray-900/40 backdrop-blur-2xl border border-gray-700/50
        rounded-3xl shadow-2xl shadow-black/60
        p-8 md:p-12
      ">

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-7">

          {/* Logo + Title */}
          <div className="flex flex-col items-center gap-3 mb-2">
            <img
              src={Logo}
              alt="ChatUp"
              className="h-16 md:h-20 w-auto drop-shadow-lg"
            />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              ChatUp
            </h1>
          </div>

          {/* Username */}
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={values.username}
            onChange={handleChange}
            minLength={3}
            required
            disabled={isSubmitting}
            autoComplete="username"
            className="
              w-full px-5 py-4 rounded-xl
              bg-gray-800/50 border border-gray-700/70
              text-white placeholder-gray-500
              focus:border-indigo-500/70 focus:bg-gray-800/70 focus:ring-2 focus:ring-indigo-500/30
              outline-none transition-all duration-200
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          />

          {/* Email */}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={values.email}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            autoComplete="email"
            className="
              w-full px-5 py-4 rounded-xl
              bg-gray-800/50 border border-gray-700/70
              text-white placeholder-gray-500
              focus:border-indigo-500/70 focus:bg-gray-800/70 focus:ring-2 focus:ring-indigo-500/30
              outline-none transition-all duration-200
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          />

          {/* Password */}
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={values.password}
            onChange={handleChange}
            minLength={8}
            required
            disabled={isSubmitting}
            autoComplete="new-password"
            className="
              w-full px-5 py-4 rounded-xl
              bg-gray-800/50 border border-gray-700/70
              text-white placeholder-gray-500
              focus:border-indigo-500/70 focus:bg-gray-800/70 focus:ring-2 focus:ring-indigo-500/30
              outline-none transition-all duration-200
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          />

          {/* Confirm Password */}
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={values.confirmPassword}
            onChange={handleChange}
            minLength={8}
            required
            disabled={isSubmitting}
            autoComplete="new-password"
            className="
              w-full px-5 py-4 rounded-xl
              bg-gray-800/50 border border-gray-700/70
              text-white placeholder-gray-500
              focus:border-indigo-500/70 focus:bg-gray-800/70 focus:ring-2 focus:ring-indigo-500/30
              outline-none transition-all duration-200
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              w-full py-4 rounded-xl font-semibold text-lg tracking-wide mt-2
              transition-all duration-300 transform
              ${
                !isSubmitting
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-700/40 hover:shadow-xl hover:shadow-indigo-700/50 hover:scale-[1.02] active:scale-95"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed opacity-70"
              }
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>

          {/* Login link */}
          <p className="text-gray-400 text-sm mt-3">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>

      <ToastContainer />
    </div>
  );
}