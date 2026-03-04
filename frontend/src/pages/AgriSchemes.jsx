import { useEffect, useState } from "react";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";

function AgriSchemes() {

  const [schemes, setSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {

    fetch(`${API_BASE_URL}/education/agri-schemes/`)
      .then(res => res.json())
      .then(data => setSchemes(data))
      .catch(err => console.error(err));

  }, []);


  const fetchSchemeDetails = async (scheme) => {

    if (expandedId === scheme.id) {
      setExpandedId(null);
      return;
    }

    try {

      const res = await fetch(
        `${API_BASE_URL}/education/agri-schemes/${scheme.id}/`
      );

      const data = await res.json();

      setSelectedScheme(data);

      setExpandedId(scheme.id);

    } catch (err) {

      console.error(err);

    }
  };


  return (

    <>
      <Navbar />

      <div style={{
        padding: "30px",
        paddingTop: "90px",
        maxWidth: "900px",
        margin: "0 auto"
      }}>

        <h2 style={{ textAlign: "center", marginBottom: "40px" }}>
          <TranslateText>Agriculture Schemes</TranslateText>
        </h2>


        {schemes.map((scheme) => {

          const isExpanded = expandedId === scheme.id;

          return (

            <div key={scheme.id} style={{
              marginBottom: "20px",
              padding: "20px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9"
            }}>

              <h3>{scheme.name}</h3>

              <p>
                <strong>Description:</strong> {scheme.description}
              </p>


              {isExpanded && selectedScheme && (

                <div style={{
                  marginTop: "15px",
                  padding: "15px",
                  border: "2px solid #4caf50",
                  borderRadius: "8px",
                  backgroundColor: "#f1fff1"
                }}>

                  <h4>Scheme Details</h4>

                  <p>
                    <strong>Eligibility:</strong><br />
                    {selectedScheme.eligibility || "Not available"}
                  </p>

                  <p>
                    <strong>Benefits:</strong><br />
                    {selectedScheme.benefits || "Not available"}
                  </p>

                  {selectedScheme.official_link && (
                    <a
                      href={selectedScheme.official_link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Apply on Official Website
                    </a>
                  )}

                </div>
              )}


              <button
                onClick={() => fetchSchemeDetails(scheme)}
                style={{
                  padding: "8px 15px",
                  backgroundColor: "#4caf50",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  marginTop: "10px"
                }}
              >
                {isExpanded ? "View Less" : "View More"}
              </button>

            </div>

          );
        })}

      </div>

    </>
  );
}

export default AgriSchemes;