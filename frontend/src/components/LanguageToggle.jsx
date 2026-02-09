import { useLanguage } from "../context/LanguageContext";

export default function LanguageToggle() {
  const { toLang, setToLang } = useLanguage();

  return (
    <div style={wrapper}>
      <select value={toLang} onChange={(e) => setToLang(e.target.value)}>
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="gu">ગુજરાતી</option>
        <option value="mr">मराठी</option>
        <option value="ta">தமிழ்</option>
        <option value="te">తెలుగు</option>
        <option value="kn">ಕನ್ನಡ</option>
      </select>
    </div>
  );
}

const wrapper = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};
