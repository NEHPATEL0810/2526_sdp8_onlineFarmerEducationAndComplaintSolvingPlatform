import React, { useState } from "react";
import { motion } from "framer-motion";
import FarmEasyLogo from "../assets/Logo.png";
import { useNavigate } from "react-router-dom";
import LanguageToggle from "./LanguageToggle";
import TranslateText from "./TranslateText";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ResetPassword from "../pages/ResetPassword";
import ForgotPassword from "../pages/ForgotPassword";
import ElectricBorder from "./ElectricBorder";
export default function Navbar() {
  // const [open, setOpen] = React.useState(false);
  //   const handleClickOpen = () => {
  //     setOpen(true);
  //   };
  //   const handleClose = () => {
  //     setOpen(false);
  //   };
  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const [openForgot, setOpenForgot] = useState(false);
  const [openReset, setOpenReset] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEduDropdown, setShowEduDropdown] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("access");

  return (
    <nav style={navStyle}>
      <div style={navInnerStyle}>
        <motion.div
          style={brandWrapperStyle}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={brandLogoCircleStyle}>
            <img
              src={FarmEasyLogo}
              alt="FarmEasy logo"
              style={logoStyle}
            />
          </div>
          <div style={brandTextContainerStyle}>
            <span style={brandTitleStyle}>FarmEasy</span>
            <span style={brandSubtitleStyle}>
              <TranslateText>Grow smarter, farm better</TranslateText>
            </span>
          </div>
          <div style={brandLanguageWrapperStyle}>
            <LanguageToggle />
          </div>
        </motion.div>

        <div style={menuStyle}>
          <motion.span
            style={linkStyle}
            whileHover={linkHoverAnimation}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/about")}
          >
            <TranslateText>About Us</TranslateText>
          </motion.span>

          <div
          style={{ position: "relative", display: "inline-block" }}
          onMouseEnter={() => setShowEduDropdown(true)}
          onMouseLeave={() => setShowEduDropdown(false)}
          >
            <motion.span
              style={linkStyle}
              whileHover={linkHoverAnimation}
              whileTap={{ scale: 0.96 }}
            >
              <TranslateText>Education</TranslateText> ▼
            </motion.span>

            {showEduDropdown && (
              <div style={dropdownStyle}>
                <motion.div
                  style={dropdownItemStyle}
                  whileHover={dropdownHoverAnimation}
                  onClick={() => navigate("/crops")}
                >
                  Crop Encyclopedia
                </motion.div>

                <motion.div
                  style={dropdownItemStyle}
                  whileHover={dropdownHoverAnimation}
                  onClick={() => navigate("/market-prices")}
                >
                  Market Prices
                </motion.div>

                <motion.div
                  style={dropdownItemStyle}
                  whileHover={dropdownHoverAnimation}
                  onClick={() => navigate("/agri-schemes")}
                >
                  Agriculture Schemes
                </motion.div>
              </div>
            )}
          </div>


          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <motion.span
              style={linkStyle}
              whileHover={linkHoverAnimation}
              whileTap={{ scale: 0.96 }}
            >
              <TranslateText>Complaints</TranslateText> ▼
            </motion.span>

            {showDropdown && (
              <div style={dropdownStyle}>
                <motion.div
                  style={dropdownItemStyle}
                  whileHover={dropdownHoverAnimation}
                  onClick={() => navigate("/create/doubts")}
                >
                  Create Doubt
                </motion.div>

                <motion.div
                  style={dropdownItemStyle}
                  whileHover={dropdownHoverAnimation}
                  onClick={() => navigate("/doubts")}
                >
                  View My Doubts
                </motion.div>
              </div>
            )}
          </div>



          <motion.span
            style={linkStyle}
            whileHover={linkHoverAnimation}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (isLoggedIn) {
                navigate("/profile");
              } else {
                setOpenLogin(true);
              }
            }}
          >
            <TranslateText>Profile</TranslateText>
          </motion.span>

          <motion.span
            style={linkStyle}
            whileHover={linkHoverAnimation}
            whileTap={{ scale: 0.96 }}
          >
            <TranslateText>Contact Us</TranslateText>
          </motion.span>
       
        {/* <Dialog open={openLogin} onClose={() => setOpenLogin(false)}>
          <DialogContent>
            <Login
              OnRegisterClick={() => {
                setOpenLogin(false);
                setOpenRegister(true);
              }}
              onForgotClick={() => {
                setOpenLogin(false);
                setOpenForgot(true);
              }}
            />
          </DialogContent>
        </Dialog> */}

          <Dialog
          open={openLogin}
          onClose={() => setOpenLogin(false)}
          PaperProps={{
            style: {
              background: "transparent",
              boxShadow: "none",
              overflow: "visible",
            },
          }}
        >
          <DialogContent style={{
            padding: 0,
            overflow: "visible",
          }}>
            <ElectricBorder
              color="#4ca750"
              speed={1}
              chaos={0.12}
              borderRadius={16}
              style={{ borderRadius: 16 }}
            >
              <div style={loginCardStyle}>
                <Login
                  OnRegisterClick={() => {
                    setOpenLogin(false);
                    setOpenRegister(true);
                  }}
                  onForgotClick={() => {
                    setOpenLogin(false);
                    setOpenForgot(true);
                  }}
                />
              </div>
            </ElectricBorder>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openRegister}
          onClose={() => {
            setOpenRegister(false);
          }}
        >
          <DialogContent>
            <Register
              onBackToLogin={() => {
                setOpenRegister(false);
                setOpenLogin(true);
              }}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={openForgot} onClose={() => setOpenForgot(false)}>
          <DialogContent>
            <ForgotPassword
              onBackToLogin={() => {
                setOpenForgot(false);
                setOpenLogin(true);
              }}
              onResetLinkSent={() => {
                setOpenForgot(false);
                setOpenReset(true);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={openReset} onClose={() => setOpenReset(false)}>
          <DialogContent>
            <ResetPassword
              onBackToLogin={() => {
                setOpenReset(false);
                setOpenLogin(true);
              }}
            />
          </DialogContent>
          </Dialog>
       
        </div>
      </div>
    </nav>
  );
}

const navStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: "72px",
  display: "flex",
  alignItems: "center",
  background:
    "linear-gradient(90deg, #16a34a, #4ade80)",
  zIndex: 1000,
  boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
  borderRadius: "0 0 18px 18px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(12px)",
};

const navInnerStyle = {
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 2rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, -system-ui, "Segoe UI", sans-serif',
};


const brandWrapperStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.9rem",
};

const brandLogoCircleStyle = {
  padding: "4px 12px",
  borderRadius: "999px",
  backgroundColor: "rgba(255,255,255,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 6px 18px rgba(15,23,42,0.35)",
  border: "1px solid rgba(209,250,229,0.6)",
};

const logoStyle = {
  height: "30px",
  width: "auto",
  cursor: "pointer",
};

const brandTextContainerStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const brandTitleStyle = {
  color: "#f9fafb",
  fontSize: "1.2rem",
  fontWeight: 650,
  letterSpacing: "0.04em",
};

const brandSubtitleStyle = {
  color: "rgba(226,232,240,0.9)",
  fontSize: "0.8rem",
  fontWeight: 400,
};

const brandLanguageWrapperStyle = {
  marginLeft: "1.5rem",
  padding: "4px 10px",
  borderRadius: 999,
  backgroundColor: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(209,250,229,0.5)",
  display: "flex",
  alignItems: "center",
};

const menuStyle = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
};

const linkStyle = {
  color: "rgba(248,250,252,0.9)",
  textDecoration: "none",
  fontSize: "1.02rem",
  fontWeight: 500,
  padding: "0.5rem 0.9rem",
  margin: "0 0.15rem",
  transition: "all 0.3s ease",
  cursor: "pointer",
  borderRadius: 999,
};

const linkHoverAnimation = {
  backgroundColor: "rgba(148,163,184,0.22)",
  y: -1,
};


const loginCardStyle = {
  background: "#0f172a",
  padding: "2rem",
  width: "360px",
  borderRadius: "16px",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const dropdownItemStyle = {
  padding: "8px 14px",
  cursor: "pointer",
  color: "rgba(226,232,240,0.96)",
  fontSize: "0.95rem",
  whiteSpace: "nowrap",
};

const dropdownHoverAnimation = {
  backgroundColor: "#1e293b",
  x: 2,
};

const dropdownStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  background: "rgba(15,118,110,0.97)",
  border: "1px solid rgba(148,163,184,0.45)",
  borderRadius: "8px",
  padding: "8px 0",
  minWidth: "180px",
  zIndex: 1000,
};
