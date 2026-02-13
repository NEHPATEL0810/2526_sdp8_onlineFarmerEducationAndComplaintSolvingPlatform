import Navbar from "../components/Navbar";
import TranslateText from "../components/TranslateText";
import DomeGallery from "../components/DomeGallery";
import ServicesSection from "../components/ServicesSection";
import SolutionsSection from "../components/SolutionsSection";
import StatsSection from "../components/StatsSection";
import TestimonialsSection from "../components/TestimonialsSection";
import BlogSection from "../components/BlogSection";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero — DomeGallery (existing) */}
      <section
        style={{
          marginTop: "72px",
          padding: 0,
          height: "calc(100vh - 72px)",
          width: "100%",
        }}
      >
        <DomeGallery
          fit={0.8}
          minRadius={600}
          maxVerticalRotationDeg={0}
          segments={34}
          dragDampening={2}
          grayscale={false}
          overlayBlurColor="#14532d"
        />
      </section>

      {/* Welcome Banner */}
      <section
        className="w-full py-20 md:py-28 px-4 text-center"
        style={{ background: "#ffffc5" }}
      >
        <h1
          className="text-4xl md:text-5xl font-extrabold mb-4"
          style={{ color: "#15803d" }}
        >
          <TranslateText>Welcome to</TranslateText> <span style={{ color: "#4caf50" }}>FarmEasy</span> 🌱
        </h1>
        <p className="text-base md:text-lg max-w-2xl mx-auto text-gray-600 leading-relaxed">
          <TranslateText>Your AI-powered farming companion — ask crop queries, check real-time market prices, explore government schemes, and grow with confidence.</TranslateText>
        </p>
      </section>

      {/* New Sections */}
      <ServicesSection />
      <SolutionsSection />
      <StatsSection />
      <TestimonialsSection />
      <BlogSection />
      <Footer />
    </>
  );
}
