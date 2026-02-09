import { useEffect, useState } from "react";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";

function AgriSchemes() {
  const [schemes,setSchemes]=useState([]);
  const [selectedScheme,setSelectedScheme]=useState(null);

  useEffect(()=>{
    fetch(`${API_BASE_URL}/education/agri-schemes/`)
      .then((res)=>res.json())
      .then((data)=>{
        setSchemes(data);
      })
      .catch((err)=>{
        console.error("Error fetching schemes:",err);
      })
  },[]);

  return (
  <>
    <Navbar />
    <div style={{ padding: "30px", paddingTop: "90px", maxWidth: "900px", margin: "0 auto" }}>
    <h2 style={{ textAlign: "center", marginBottom: "40px" }}>
      <TranslateText>Agriculture Schemes</TranslateText>
    </h2>

    {schemes.map((scheme) => (
      <div
        key={scheme.id}
        style={{
          marginBottom: "40px",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9"
        }}
      >
        <h3 style={{ marginBottom: "15px" }}>{scheme.name}</h3>

        <p>
          <strong><TranslateText>Description:</TranslateText></strong>
        </p>
        <p style={{ marginBottom: "15px" }}>{scheme.description}</p>

        <p>
          <strong><TranslateText>Benefits:</TranslateText></strong>
        </p>
        <ul style={{ marginBottom: "15px" }}>
          {scheme.benefits.split("\r\n").map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>

        <p>
          <strong><TranslateText>Eligibility:</TranslateText></strong>
        </p>
        <p style={{ marginBottom: "15px" }}>{scheme.eligibility}</p>

        <p>
          <a
            href={scheme.official_link}
            target="_blank"
            rel="noreferrer"
            style={{ color: "blue", fontWeight: "bold" }}
          >
            <TranslateText>Official Website</TranslateText>
          </a>
        </p>
      </div>
    ))}
    </div>
  </>
);

}

export default AgriSchemes;
