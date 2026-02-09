import { useState } from "react";
import API_BASE_URL from "../services/api";
import ElectricBorder from "../components/ElectricBorder";

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const text = await response.text();
      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Server returned HTML:", text);
        setError("Server error. Please try again later.");
        return;
      }

      if (response.ok) {
        setMessage(
          "If an account with that email exists, a reset link has been sent."
        );
        setEmail("");
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    }
  };

  return (
    <div style={overlayStyle}>
      <ElectricBorder color="#4ca750" thickness={2} speed={0.8} chaos={0.08}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Forgot Password</h1>

          <form onSubmit={handleSubmit} style={formStyle}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
              autoComplete="email"
            />

            {error && <p style={errorStyle}>{error}</p>}
            {message && <p style={successStyle}>{message}</p>}

            <button type="submit" style={buttonStyle}>
              Send Reset Link
            </button>
          </form>

          <p style={footerStyle}>
            <span style={linkStyle} onClick={onBackToLogin}>
              Back to Login
            </span>
          </p>
        </div>
      </ElectricBorder>
    </div>
  );
}

export default ForgotPassword;


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
  width: "420px",
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
  fontFamily: "'Poppins', sans-serif",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.9rem",
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
  width: "90%",
  marginTop: "0.6rem",
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
  marginTop: "1.3rem",
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

const successStyle = {
  width: "90%",
  textAlign: "center",
  color: "#22c55e",
  fontSize: "0.85rem",
};
