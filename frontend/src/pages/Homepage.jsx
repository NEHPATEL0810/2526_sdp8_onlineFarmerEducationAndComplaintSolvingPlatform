import Navbar from "../components/Navbar";
import TranslateText from "../components/TranslateText";
import DomeGallery from "../components/DomeGallery";
export default function HomePage() {
  return (
    <>
      <Navbar />

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

      <section style={{ minHeight: "100vh", padding: "0 2rem 2rem" }}>
        <h1>
          <TranslateText>Welcome to FarmEasy 🌱</TranslateText>
        </h1>
        <p>
          <TranslateText>Your Farming Companion starts here</TranslateText>
        </p>
      </section>

      

      <section style={{ minHeight: "100vh" }} />
    </>
  );
}
