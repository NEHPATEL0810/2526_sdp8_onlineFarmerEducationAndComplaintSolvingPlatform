import { useState } from "react";
import API_BASE_URL from "../services/api";
import Navbar from "../components/Navbar";

function CreateDoubt() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        const token = localStorage.getItem("access");

        if (!token) {
            setError("Please login first.");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        if (image) formData.append("image", image);

        try {
            const response = await fetch(
                `${API_BASE_URL}/education/doubts/create/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                setError("Session expired. Please login again.");
                return;
            }

            const data = await response.json();

            if (response.ok) {
                setMessage("Doubt submitted successfully!");
                setTitle("");
                setDescription("");
                setImage(null);
            } else {
                setError(data.detail || "Something went wrong.");
            }
        } catch (err) {
            console.error(err);
            setError("Network error.");
        }
    };


    return (
        <>
            <Navbar />

            <div style={{ padding: "20px" }}>
                <h2>🧑‍🌾 Submit Doubt</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Doubt Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                    <br /><br />

                    <textarea
                        placeholder="Describe your problem..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                    <br /><br />

                    <input
                        type="file"
                        onChange={(e) => setImage(e.target.files[0])}
                    />
                    <br /><br />

                    <button type="submit">Submit</button>
                </form>

                {message && <p style={{ color: "green" }}>{message}</p>}
                {error && <p style={{ color: "red" }}>{error}</p>}
            </div>
        </>


    );
}

export default CreateDoubt;
