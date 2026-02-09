import { useEffect, useState } from "react";
import API_BASE_URL from "../services/api";
import Navbar from "../components/Navbar";

function MyDoubts() {
    const [doubts, setDoubts] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("access");

        if (!token) {
            setError("Please login first.");
            return;
        }

        fetch(`${API_BASE_URL}/education/doubts/my/`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (res.status === 401) {
                    localStorage.removeItem("access");
                    localStorage.removeItem("refresh");
                    throw new Error("Unauthorized");
                }
                return res.json();
            })
            .then((data) => setDoubts(data))
            .catch((err) => {
                console.error(err);
                setError("Please login again.");
            });
    }, []);


    return (
        <>
            <Navbar />
            <div style={{ padding: "20px" }}>
                <h2>📋 My Doubts</h2>

                {doubts.length === 0 && <p>No doubts submitted yet.</p>}

                {doubts.map((doubt) => (
                    <div
                        key={doubt.id}
                        style={{
                            border: "1px solid #ccc",
                            padding: "10px",
                            marginBottom: "10px",
                        }}
                    >
                        <h3>{doubt.title}</h3>
                        <p>{doubt.description}</p>

                        {doubt.image && (
                            <img
                                src={`http://127.0.0.1:8000${doubt.image}`}
                                alt="doubt"
                                width="200"
                            />
                        )}

                        <p>Status: {doubt.status}</p>

                        {doubt.reply && (
                            <>
                                <hr />
                                <p><b>Expert Reply:</b></p>
                                <p>{doubt.reply}</p>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </>

    );
}

export default MyDoubts;
