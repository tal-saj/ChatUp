// Register.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/axiosConfig";
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
    theme: "light",
    toastClassName: "!rounded-xl !shadow-lg !border !border-slate-200",
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

      const { data } = await api.post(registerRoute, {
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
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-white overflow-hidden">

      {/* Very subtle background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-slate-200/15 blur-3xl animate-pulse-slow" />
        <div className="absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-slate-300/10 blur-3xl animate-pulse animation-delay-4000" />
      </div>

      {/* Glassmorphic register card */}
      <div
        className="
          relative z-10 w-full max-w-lg
          bg-white/35 backdrop-blur-2xl border border-slate-200/70
          rounded-3xl shadow-2xl shadow-slate-300/30
          p-8 md:p-12
          transition-all duration-500
          hover:shadow-slate-400/40
        "
      >
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-7">

          {/* Logo + Title */}
          <div className="flex flex-col items-center gap-4 mb-3">
            <img
              src={Logo}
              alt="ChatUp"
              className="h-16 md:h-20 w-auto drop-shadow-md transition-transform duration-300 hover:scale-105"
            />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              ChatUp
            </h1>
          </div>

          {/* Username */}
          <div className="w-full group">
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
                bg-white/50 border border-slate-300/60 text-slate-800
                placeholder-slate-400
                focus:border-slate-400 focus:bg-white/70 focus:ring-2 focus:ring-slate-300/40 focus:shadow-inner
                outline-none transition-all duration-300
                disabled:opacity-60 disabled:cursor-not-allowed
                group-hover:shadow-sm
              "
            />
          </div>

          {/* Email */}
          <div className="w-full group">
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
                bg-white/50 border border-slate-300/60 text-slate-800
                placeholder-slate-400
                focus:border-slate-400 focus:bg-white/70 focus:ring-2 focus:ring-slate-300/40 focus:shadow-inner
                outline-none transition-all duration-300
                disabled:opacity-60 disabled:cursor-not-allowed
                group-hover:shadow-sm
              "
            />
          </div>

          {/* Password */}
          <div className="w-full group">
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
                bg-white/50 border border-slate-300/60 text-slate-800
                placeholder-slate-400
                focus:border-slate-400 focus:bg-white/70 focus:ring-2 focus:ring-slate-300/40 focus:shadow-inner
                outline-none transition-all duration-300
                disabled:opacity-60 disabled:cursor-not-allowed
                group-hover:shadow-sm
              "
            />
          </div>

          {/* Confirm Password */}
          <div className="w-full group">
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
                bg-white/50 border border-slate-300/60 text-slate-800
                placeholder-slate-400
                focus:border-slate-400 focus:bg-white/70 focus:ring-2 focus:ring-slate-300/40 focus:shadow-inner
                outline-none transition-all duration-300
                disabled:opacity-60 disabled:cursor-not-allowed
                group-hover:shadow-sm
              "
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              w-full py-4 rounded-xl font-semibold text-lg tracking-wide mt-3
              transition-all duration-300 transform
              ${
                !isSubmitting
                  ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-500/30 hover:shadow-xl hover:shadow-slate-600/40 hover:brightness-110 hover:scale-[1.015] active:scale-98"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-70"
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
          <p className="text-slate-600 text-sm mt-4">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-slate-800 font-medium hover:text-slate-900 transition-colors duration-200 underline-offset-4 hover:underline"
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