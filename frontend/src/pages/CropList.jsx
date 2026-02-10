import { useEffect, useState } from "react";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";

function CropList() {
    const [crops, setCrops] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        fetchCrops();
    }, []);

    const fetchCrops = (query = "") => {
        setLoading(true);

        const url = query
            ? `${API_BASE_URL}/education/crops/?search=${query}`
            : `${API_BASE_URL}/education/crops/`;

        fetch(url)
            .then((res) => res.json())
            .then((data) => {
                setCrops(data);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchCrops(search);
    };

    return (
        <>
            <Navbar />
            <div style={{ padding: "20px", paddingTop: "90px" }}>
            <h2><TranslateText>🌾 Crop Encyclopedia</TranslateText></h2>

            {/* SEARCH */}
            <form onSubmit={handleSearch} style={{ marginBottom: "20px" }}>
                <input
                    type="text"
                    placeholder="Search crop (e.g. Wheat)"
                    value={search}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSearch(value);

                        if (value.length > 0) {
                            fetch(`${API_BASE_URL}/education/crops/?search=${value}`)
                                .then((res) => res.json())
                                .then((data) => {
                                    setSuggestions(data);
                                })
                        }
                        else {
                            setSuggestions([]);
                        }
                    }}
                    style={{ padding: "8px", width: "250px" }}
                />
                {suggestions.length > 0 && (
                    <div style={{
                        border: "1px solid #ccc",
                        width: "250px",
                        backgroundColor: "#fff",
                        position: "absolute",
                        zIndex: 1000
                    }}>
                        {suggestions.map((crop) => (
                            <div
                                key={crop.id}
                                style={{ padding: "8px", cursor: "pointer" }}
                                onClick={() => {
                                    setSelectedCrop(crop);
                                    setSearch(crop.name);
                                    setSuggestions([]);
                                }}
                            >
                                {crop.name}
                            </div>
                        ))}
                    </div>
                )}

                &nbsp;
                <button type="submit" style={{ padding: "8px 15px" }}>
                    <TranslateText>Search</TranslateText>
                </button>
            </form>

            {loading && <p><TranslateText>Loading crops...</TranslateText></p>}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                {!loading && crops.length === 0 && <p><TranslateText>No crops found.</TranslateText></p>}

                {crops.map((crop) => (
                    <div
                        key={crop.id}
                        style={{
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            width: "250px",
                            padding: "10px",
                        }}
                    >
                        {crop.image && (
                            <img
                                src={`http://127.0.0.1:8000${crop.image}`}
                                alt={crop.name}
                                style={{
                                    width: "100%",
                                    height: "150px",
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                }}
                            />
                        )}

                        <h3>{crop.name}</h3>
                        <p><b><TranslateText>Season:</TranslateText></b> {crop.season}</p>
                        <p><b><TranslateText>Soil:</TranslateText></b> {crop.soil.join(", ")}</p>
                        <button
                            style={{ marginTop: "10px" }}
                            onClick={() => setSelectedCrop(crop)}
                        >
                            <TranslateText>View Details</TranslateText>
                        </button>


                    </div>
                ))}
            </div>
            {selectedCrop && (
                <div style={overlayStyle}>
                    <div style={modalStyle}>
                        <button
                            style={closeBtnStyle}
                            onClick={() => setSelectedCrop(null)}
                        >
                            ✖
                        </button>

                        <h2>{selectedCrop.name}</h2>

                        {/* IMAGES */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                flexWrap: "wrap",
                                gap: "15px",
                                marginBottom: "20px",
                            }}
                        >

                            {selectedCrop.image && (
                                <img
                                    src={`http://127.0.0.1:8000${selectedCrop.image}`}
                                    alt={selectedCrop.name}
                                    style={{ width: "180px", borderRadius: "6px" }}
                                />
                            )}
                        </div>

                        <p><b><TranslateText>Season:</TranslateText></b> {selectedCrop.season}</p>
                        <p><b><TranslateText>Soil:</TranslateText></b> {selectedCrop.soil.join(", ")}</p>
                        <p><b><TranslateText>Climate:</TranslateText></b> {selectedCrop.climate}</p>
                        <p><b><TranslateText>Duration:</TranslateText></b> {selectedCrop.duration}</p>
                        <p><b><TranslateText>Sowing Time:</TranslateText></b> {selectedCrop.sowing_time}</p>

                        <hr />

                        <p><b><TranslateText>Fertilizer:</TranslateText></b> {selectedCrop.fertilizer}</p>
                        <p><b><TranslateText>Irrigation:</TranslateText></b> {selectedCrop.irrigation}</p>
                        <p><b><TranslateText>Expected Yield:</TranslateText></b> {selectedCrop.yield_info}</p>

                        <h3><TranslateText>🌱 Farming Steps</TranslateText></h3>
                        <ul>
                            {selectedCrop.steps?.map((step, idx) => (
                                <li key={idx}>{step}</li>
                            ))}
                        </ul>

                        {selectedCrop.common_mistakes && (
                            <>
                                <h3><TranslateText>⚠️ Common Mistakes</TranslateText></h3>
                                <ul>
                                    {selectedCrop.common_mistakes.map((m, idx) => (
                                        <li key={idx}>{m}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            )}
            </div>
        </>
    );
}
const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
};

const modalStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "80%",
    maxHeight: "90vh",
    overflowY: "auto",
    position: "relative",
};

const closeBtnStyle = {
    position: "absolute",
    top: "10px",
    right: "10px",
    padding: "1px",
    backgroundColor: "red",
    color: "#fff",
    border: "none",
    borderRadius: "100%",
    width: "30px",
    height: "40px",
    cursor: "pointer",
};

export default CropList;
