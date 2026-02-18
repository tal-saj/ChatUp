import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../assets/logo.svg";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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

  // Redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)) {
      navigate("/");
    }
  }, [navigate]);

  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };

  const handleValidation = () => {
    const { password, confirmPassword, username, email } = values;

    if (password !== confirmPassword) {
      toast.error("Password and confirm password must match.", toastOptions);
      return false;
    }
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters.", toastOptions);
      return false;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.", toastOptions);
      return false;
    }
    if (!email.trim()) {
      toast.error("Email is required.", toastOptions);
      return false;
    }
    // Optional: basic email format check
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.", toastOptions);
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!handleValidation()) return;

    setIsSubmitting(true);

    try {
      const { username, email, password } = values;

      const { data } = await axios.post(registerRoute, {
        username,
        email,
        password,
      });

      if (data.status === false) {
        toast.error(data.msg || "Registration failed. Try again.", toastOptions);
      } else if (data.status === true) {
        localStorage.setItem(
          process.env.REACT_APP_LOCALHOST_KEY,
          JSON.stringify(data.user)
        );
        toast.success("Account created successfully!", toastOptions);
        navigate("/");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        error.response?.data?.msg ||
          "Something went wrong. Please try again later.",
        toastOptions
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FormContainer>
        <form onSubmit={handleSubmit}>
          <div className="brand">
            <img src={Logo} alt="ChatUp logo" />
            <h1>ChatUp</h1>
          </div>

          <input
            type="text"
            placeholder="Username"
            name="username"
            value={values.username}
            onChange={handleChange}
            minLength={3}
            required
            disabled={isSubmitting}
            aria-label="Username"
          />

          <input
            type="email"
            placeholder="Email"
            name="email"
            value={values.email}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            aria-label="Email"
          />

          <input
            type="password"
            placeholder="Password"
            name="password"
            value={values.password}
            onChange={handleChange}
            minLength={8}
            required
            disabled={isSubmitting}
            aria-label="Password"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            name="confirmPassword"
            value={values.confirmPassword}
            onChange={handleChange}
            minLength={8}
            required
            disabled={isSubmitting}
            aria-label="Confirm Password"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            aria-label="Create account"
          >
            {isSubmitting ? "Creating..." : "Create User"}
          </button>

          <span>
            Already have an account? <Link to="/login">Login.</Link>
          </span>
        </form>
      </FormContainer>

      <ToastContainer />
    </>
  );
}

const FormContainer = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #131324;
  gap: 1rem;
  padding: 1rem;

  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1.5rem;

    img {
      height: 5rem;
    }

    h1 {
      color: white;
      text-transform: uppercase;
      font-size: 2.5rem;
    }
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.8rem;
    background-color: #00000076;
    border-radius: 2rem;
    padding: 3.5rem 5rem;
    width: 100%;
    max-width: 480px;

    @media screen and (max-width: 768px) {
      padding: 2.5rem 2rem;
      gap: 1.5rem;
    }
  }

  input {
    background-color: transparent;
    padding: 1rem 1.2rem;
    border: 0.1rem solid #4e0eff;
    border-radius: 0.5rem;
    color: white;
    font-size: 1rem;
    width: 100%;

    &:focus {
      border-color: #997af0;
      outline: none;
      box-shadow: 0 0 0 3px rgba(153, 122, 240, 0.25);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  button {
    background-color: #4e0eff;
    color: white;
    padding: 1rem 2.5rem;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 0.5rem;
    font-size: 1.1rem;
    text-transform: uppercase;
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      background-color: #3d0cd1;
      transform: translateY(-2px);
    }

    &:disabled {
      background-color: #555;
      cursor: not-allowed;
      opacity: 0.7;
    }
  }

  span {
    color: white;
    text-align: center;
    font-size: 0.95rem;
    text-transform: uppercase;

    a {
      color: #4e0eff;
      text-decoration: none;
      font-weight: bold;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;