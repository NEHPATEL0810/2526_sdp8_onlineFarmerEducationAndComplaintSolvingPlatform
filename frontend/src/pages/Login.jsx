import { useState } from "react";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import { useNavigate } from "react-router-dom";

function Login({ OnRegisterClick, onForgotClick }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const navigate=useNavigate();

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const text = await response.text();
      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Server returned HTML:", text);
        return;
      }

      if (response.ok) {
        localStorage.setItem("access", data.access);
        localStorage.setItem("refresh", data.refresh);
        setFormData({ username: "", password: "" });
        navigate("/profile");
      } else {
        setErrors(data);
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  };

  return (
    <div style={loginContainerStyle}>
      <h1 style={titleStyle}>
        <TranslateText>Login</TranslateText>
      </h1>

      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          autoComplete="username"
          style={inputStyle}
          required
        />
        {errors.username && (
          <p style={errorStyle}>{errors.username[0]}</p>
        )}

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
          style={inputStyle}
          required
        />
        {errors.password && (
          <p style={errorStyle}>{errors.password[0]}</p>
        )}

        <button type="submit" style={buttonStyle}>
          <TranslateText>Login</TranslateText>
        </button>
      </form>

      <p style={forgotStyle} onClick={onForgotClick}>
        <TranslateText>Forgot Password?</TranslateText>
      </p>

      <p style={registerStyle}>
        <TranslateText>Don't have an account?</TranslateText>{" "}
        <span style={registerLinkStyle} onClick={OnRegisterClick}>
          <TranslateText>Register</TranslateText>
        </span>
      </p>
    </div>
  );
}

export default Login;


/* ------------------ STYLES ------------------ */

const loginContainerStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const formStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const titleStyle = {
  marginBottom: "1.8rem",
  fontSize: "2rem",
  fontWeight: "700",
  fontFamily: "'Poppins', sans-serif",
};

const inputStyle = {
  width: "100%",
  maxWidth: "280px",
  padding: "0.75rem",
  marginBottom: "0.9rem",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#020617",
  color: "#ffffff",
  textAlign: "center",
  fontSize: "0.95rem",
};

const buttonStyle = {
  width: "100%",
  maxWidth: "280px",
  padding: "0.75rem",
  marginTop: "0.6rem",
  borderRadius: "10px",
  border: "none",
  background: "#4ca750",
  color: "#ffffff",
  fontSize: "1rem",
  fontWeight: "600",
  cursor: "pointer",
};

const errorStyle = {
  width: "100%",
  maxWidth: "280px",
  color: "#ef4444",
  fontSize: "0.8rem",
  marginTop: "-0.4rem",
  marginBottom: "0.6rem",
  textAlign: "left",
};

const forgotStyle = {
  marginTop: "1rem",
  fontSize: "0.9rem",
  color: "#4ca750",
  cursor: "pointer",
};

const registerStyle = {
  marginTop: "1.5rem",
  fontSize: "0.9rem",
  opacity: 0.9,
};

const registerLinkStyle = {
  color: "#4ca750",
  cursor: "pointer",
  fontWeight: "500",
};
