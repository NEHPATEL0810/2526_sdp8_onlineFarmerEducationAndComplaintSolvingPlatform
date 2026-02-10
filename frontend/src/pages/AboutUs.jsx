import React from "react";
import { motion } from "framer-motion";
import TranslateText from "../components/TranslateText";

export default function AboutUs() {
  return (
    <div style={pageWrapperStyle}>
      <div style={contentContainerStyle}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p style={eyebrowStyle}>
            <TranslateText>About Us</TranslateText>
          </p>
          <h1 style={titleStyle}>
            <TranslateText>Growing smarter, together.</TranslateText>
          </h1>
          <p style={leadStyle}>
            <TranslateText>
              FarmEasy is an online farmer education and doubt‑solving platform
              that combines trusted knowledge, expert support, and real‑time
              insights to make everyday decisions on the farm simpler and more
              confident.
            </TranslateText>
          </p>

          <div style={gridStyle}>
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                <TranslateText>Our Mission</TranslateText>
              </h2>
              <p style={bodyStyle}>
                <TranslateText>
                  We exist to bridge the gap between technology and the field
                  —bringing clear, local‑language guidance on crops, markets,
                  and schemes so that every farmer can plan ahead, reduce risk,
                  and grow sustainably.
                </TranslateText>
              </p>
            </div>

            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                <TranslateText>What FarmEasy Offers</TranslateText>
              </h2>
              <ul style={listStyle}>
                <li>
                  <TranslateText>
                    Crop encyclopedia with region‑friendly best practices
                  </TranslateText>
                </li>
                <li>
                  <TranslateText>Daily market price visibility</TranslateText>
                </li>
                <li>
                  <TranslateText>
                    Simple breakdown of government schemes and benefits
                  </TranslateText>
                </li>
                <li>
                  <TranslateText>
                    Easy doubt‑asking and responses in familiar language
                  </TranslateText>
                </li>
              </ul>
            </div>
          </div>

          <div style={footerStripStyle}>
            <p style={footerTextStyle}>
              <TranslateText>
                FarmEasy stands beside farmers as a digital companion—available
                whenever they need clarity, guidance, or reassurance.
              </TranslateText>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const pageWrapperStyle = {
  width: "100%",
  minHeight: "calc(100vh - 90px)",
  padding: "2.5rem 1.5rem 3.5rem",
  background:
    "linear-gradient(180deg, rgba(240,253,244,0.9), rgba(236,252,203,0.85))",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif',
  display: "flex",
  justifyContent: "center",
};

const contentContainerStyle = {
  width: "100%",
  maxWidth: "1040px",
};

const eyebrowStyle = {
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "0.78rem",
  color: "#15803d",
  marginBottom: "0.35rem",
  fontWeight: 600,
};

const titleStyle = {
  fontSize: "2.1rem",
  fontWeight: 700,
  marginBottom: "0.85rem",
  color: "#022c22",
};

const leadStyle = {
  fontSize: "1rem",
  lineHeight: 1.8,
  marginBottom: "2.1rem",
  color: "#14532d",
  maxWidth: "720px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
  gap: "2.4rem",
  marginBottom: "2rem",
};

const sectionStyle = {};

const sectionTitleStyle = {
  fontSize: "1.1rem",
  fontWeight: 600,
  marginBottom: "0.7rem",
  color: "#065f46",
};

const bodyStyle = {
  fontSize: "0.98rem",
  lineHeight: 1.8,
  color: "#064e3b",
};

const listStyle = {
  listStyle: "disc",
  paddingLeft: "1.25rem",
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.45rem",
  fontSize: "0.98rem",
  color: "#064e3b",
};

const footerStripStyle = {
  marginTop: "0.8rem",
  paddingTop: "1.1rem",
  borderTop: "1px solid rgba(22,163,74,0.25)",
};

const footerTextStyle = {
  fontSize: "0.9rem",
  color: "#166534",
};

