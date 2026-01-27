import { useEffect, useState } from "react";
import API_BASE_URL from "../services/api";

function AgriSchemes() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    fetch(`${API_BASE_URL}/education/agri-schemes/`)
      .then((res) => res.json())
      .then((data) => {
        setRecords(data.records || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading schemes...</p>;

  if (!records.length) return <p>No schemes found.</p>;

  // Extract table headers dynamically
  const headers = Object.keys(records[0]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>🌱 Government Agriculture Schemes</h2>
      <p>Total Records: {records.length}</p>

      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="8" cellSpacing="0">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h.replaceAll("_", " ").toUpperCase()}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {records.map((row, idx) => (
              <tr key={idx}>
                {headers.map((h) => (
                  <td key={h}>{row[h]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AgriSchemes;
