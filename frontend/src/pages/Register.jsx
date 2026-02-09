import { useState } from "react";
import API_BASE_URL from "../services/api";
import ElectricBorder from "../components/ElectricBorder";

function Register({ onBackToLogin }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    mobile_number: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
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
        alert("Registration successful");
        onBackToLogin();
      } else {
        setErrors(data);
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  };

  return (
    <div style={overlayStyle}>
      <ElectricBorder color="#4ca750" thickness={2} speed={0.8} chaos={0.08}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Register</h1>

          <form onSubmit={handleSubmit} style={formStyle}>
            <input
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              style={inputStyle}
              required
            />
            {errors.username && (
              <p style={errorStyle}>{errors.username[0]}</p>
            )}

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              style={inputStyle}
              required
            />
            {errors.email && (
              <p style={errorStyle}>{errors.email[0]}</p>
            )}

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              style={inputStyle}
              required
            />
            {errors.password && (
              <p style={errorStyle}>{errors.password[0]}</p>
            )}

            <input
              name="mobile_number"
              placeholder="Mobile Number"
              value={formData.mobile_number}
              onChange={handleChange}
              style={inputStyle}
              required
            />

            <button type="submit" style={buttonStyle}>
              Register
            </button>
          </form>

          <p style={footerStyle}>
            Already have an account?{" "}
            <span style={linkStyle} onClick={onBackToLogin}>
              Login
            </span>
          </p>
        </div>
      </ElectricBorder>
    </div>
  );
}

export default Register;


/* ------------------ STYLES ------------------ */

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const cardStyle = {
  width: "480px",
  background: "#020617",
  borderRadius: "22px",
  padding: "1.8rem 1.6rem",
  boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
  overflow: "hidden",
  color: "#fff",
  textAlign: "center",
};

const titleStyle = {
  marginBottom: "1.4rem",
  fontSize: "2rem",
  fontWeight: 700,
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.85rem",
  alignItems: "center",
};

const inputStyle = {
  width: "90%",
  padding: "0.75rem",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#020617",
  color: "#fff",
  textAlign: "center",
  fontSize: "0.95rem",
};

const buttonStyle = {
  marginTop: "0.8rem",
  padding: "0.75rem",
  borderRadius: "10px",
  border: "none",
  background: "#4ca750",
  color: "#fff",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};

const footerStyle = {
  marginTop: "1.2rem",
  fontSize: "0.9rem",
  opacity: 0.9,
};

const linkStyle = {
  color: "#4ca750",
  cursor: "pointer",
  fontWeight: 500,
};

const errorStyle = {
  width: "90%",
  textAlign: "left",
  color: "#ef4444",
  fontSize: "0.8rem",
  marginTop: "-0.3rem",
};
