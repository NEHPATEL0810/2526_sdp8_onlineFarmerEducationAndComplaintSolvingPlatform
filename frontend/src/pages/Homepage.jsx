import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import TranslateText from "../components/TranslateText";
export default function HomePage() {
  return (
    <>
      <Navbar />

      <section style={{ minHeight: "100vh", padding: "2rem" }}>
        <h1><TranslateText>Welcome to FarmEasy 🌱</TranslateText></h1>
        <p><TranslateText>Your Farming Companion starts here</TranslateText></p>
      </section>

      

      <section style={{ minHeight: "100vh" }} />
    </>
  );
}
