import React from "react";
import { motion } from "framer-motion";
import FarmEasyLogo from "../assets/Logo.png";
import { Link } from "react-router-dom";
import LogoShuffle from "./ShufflingLogo";
import LanguageToggle from "./LanguageToggle";
import TranslateText from "./TranslateText";
export default function Navbar() {
  return (
    <nav style={navStyle}>
      <motion.div
        // style={logoContainer}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* <img src={FarmEasyLogo} alt="FarmEasy Logo" style={logoStyle} /> */}
        {/* <LogoShuffle /> */}
        <LanguageToggle
          onChange={(data) => {
            console.log("Translation:", data);
          }}
        />
      </motion.div>

      <div style={menuStyle}>
        <a style={linkStyle} href="#">
          <TranslateText> About Us </TranslateText>
        </a>
        <a style={linkStyle} href="#">
          <TranslateText> Education </TranslateText>
        </a>
        <a style={linkStyle} href="#">
          <TranslateText> Complaints </TranslateText>
        </a>
        <a style={linkStyle} href="#" onHover={linkHoverStyle}>
          <TranslateText> Profile </TranslateText>
        </a>
        <a style={linkStyle} href="#">
          <TranslateText>Contact Us </TranslateText>
        </a>
      </div>
    </nav>
  );
}

const navStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right:0,
  width: "100%",
  height: "70px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 2rem",
  backgroundColor: "#4caf50",
  zIndex: 1000,
  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  borderRadius: "0 0 25px 25px",
};

/* Logo */
const logoContainer = {
  display: "flex",
  alignItems: "center",
  fontSize:"1.2rem",
};

const logoStyle = {
  height: "45px",
  width: "auto",
  cursor: "pointer",
};

const menuStyle = {
  display: "flex",
  alignItems: "center",
//   justifyContent:"right-align",
  gap: "1rem",
//   flexDirection: "row",
  marginRight:"2rem",
};

const linkStyle = {
  color: "#fff",

  textDecoration: "none",
  fontSize: "1.5rem",
  fontWeight: "500",
  padding: "0.5rem 1rem",
  margin: "0 0.5rem",
  transition: "all 0.3s ease",
};

const linkHoverStyle = {
  backgroundColor: "#45a049",
  borderRadius: "8px",
};
