import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import Logo from "../assets/logo.svg";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loginRoute } from "../utils/APIRoutes";

export default function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ username: "", password: "" });
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

  const validateForm = () => {
    const { username, password } = values;

    if (!username.trim()) {
      toast.error("Username is required.", toastOptions);
      return false;
    }
    if (!password.trim()) {
      toast.error("Password is required.", toastOptions);
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { username, password } = values;
      const { data } = await axios.post(loginRoute, {
        username,
        password,
      });

      if (data.status === false) {
        toast.error(data.msg || "Login failed. Please check your credentials.", toastOptions);
      } else if (data.status === true) {
        localStorage.setItem(
          process.env.REACT_APP_LOCALHOST_KEY,
          JSON.stringify(data.user)
        );
        toast.success("Logged in successfully!", toastOptions);
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(
        error.response?.data?.msg || "Something went wrong. Try again later.",
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
            type="password"
            placeholder="Password"
            name="password"
            value={values.password}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            aria-label="Password"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            aria-label="Log In"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>

          <span>
            Don't have an account? <Link to="/register">Create One.</Link>
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

  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1rem;

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
    gap: 2rem;
    background-color: #00000076;
    border-radius: 2rem;
    padding: 4rem 5rem;
    width: 100%;
    max-width: 450px;

    @media screen and (max-width: 768px) {
      padding: 3rem 2rem;
    }
  }

  input {
    background-color: transparent;
    padding: 1rem;
    border: 0.1rem solid #4e0eff;
    border-radius: 0.4rem;
    color: white;
    width: 100%;
    font-size: 1rem;

    &:focus {
      border-color: #997af0;
      outline: none;
      box-shadow: 0 0 0 3px rgba(153, 122, 240, 0.2);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  button {
    background-color: #4e0eff;
    color: white;
    padding: 1rem 2rem;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 0.4rem;
    font-size: 1.1rem;
    text-transform: uppercase;
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      background-color: #3d0cd1;
      transform: translateY(-2px);
    }

    &:disabled {
      background-color: #666;
      cursor: not-allowed;
      opacity: 0.7;
    }
  }

  span {
    color: white;
    text-align: center;
    text-transform: uppercase;
    font-size: 0.9rem;

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