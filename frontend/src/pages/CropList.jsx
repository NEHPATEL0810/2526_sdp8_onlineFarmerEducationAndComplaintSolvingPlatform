import { useEffect, useState } from "react";
import API_BASE_URL from "../services/api";

function CropList() {
    const [crops, setCrops] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState(null);

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
                setCrops(data.crops || []);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchCrops(search);
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>🌾 Crop Encyclopedia</h2>

            {/* SEARCH */}
            <form onSubmit={handleSearch} style={{ marginBottom: "20px" }}>
                <input
                    type="text"
                    placeholder="Search crop (e.g. Wheat)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: "8px", width: "250px" }}
                />
                &nbsp;
                <button type="submit" style={{ padding: "8px 15px" }}>
                    Search
                </button>
            </form>

            {loading && <p>Loading crops...</p>}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                {!loading && crops.length === 0 && <p>No crops found.</p>}

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
                        {crop.images && crop.images.length > 0 && (
                            <img
                                src={`http://127.0.0.1:8000${crop.images[0]}`}
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
                        <p><b>Season:</b> {crop.season}</p>
                        <p><b>Soil:</b> {crop.soil.join(", ")}</p>
                        <button
                            style={{ marginTop: "10px" }}
                            onClick={() => setSelectedCrop(crop)}
                        >
                            View Details
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

                            {selectedCrop.images?.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={`http://127.0.0.1:8000${img}`}
                                    alt={selectedCrop.name}
                                    style={{ width: "180px", borderRadius: "6px" }}
                                />
                            ))}
                        </div>

                        <p><b>Season:</b> {selectedCrop.season}</p>
                        <p><b>Soil:</b> {selectedCrop.soil.join(", ")}</p>
                        <p><b>Climate:</b> {selectedCrop.climate}</p>
                        <p><b>Duration:</b> {selectedCrop.duration}</p>
                        <p><b>Sowing Time:</b> {selectedCrop.sowing_time}</p>

                        <hr />

                        <p><b>Fertilizer:</b> {selectedCrop.fertilizer}</p>
                        <p><b>Irrigation:</b> {selectedCrop.irrigation}</p>
                        <p><b>Expected Yield:</b> {selectedCrop.yield}</p>

                        <h3>🌱 Farming Steps</h3>
                        <ul>
                            {selectedCrop.steps?.map((step, idx) => (
                                <li key={idx}>{step}</li>
                            ))}
                        </ul>

                        {selectedCrop.common_mistakes && (
                            <>
                                <h3>⚠️ Common Mistakes</h3>
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
