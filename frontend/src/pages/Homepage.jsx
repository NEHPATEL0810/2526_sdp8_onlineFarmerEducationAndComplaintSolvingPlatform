import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import TranslateText from "../components/TranslateText";
import ScrollGallery from "../components/ScrollGallery";
import { galleryImages } from "../assets/gallery";
export default function HomePage() {
  return (
    <>
      <Navbar />

      <section style={{ minHeight: "100vh", padding: "2rem" }}>
        <h1>Welcome to FarmEasy 🌱</h1>
        <p>Your Farming Companion starts here</p>
      </section>

      {/* Scroll gallery owns everything */}
      <ScrollGallery images={galleryImages} />

      <section style={{ minHeight: "100vh" }} />
    </>
  );
}
