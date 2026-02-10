import { useEffect, useState } from "react";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";

const API_URL = "http://127.0.0.1:8000/api/education/market-prices/";
const INDIAN_STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];

function MarketPrices() {
  const [state, setState] = useState("");
  const [commodity, setCommodity] = useState("");
  const [records, setRecords] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(false);
  // Fetch data when state changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    let url = `${API_URL}?limit=200`;
    if (state) {
      url += `&state=${state}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;

        const recs = data.records || [];
        setRecords(recs);
        setLoading(false);

        const uniqueCommodities = [
          ...new Set(recs.map((r) => r.commodity)),
        ];
        setCommodities(uniqueCommodities);
        setCommodity("");
      })
      .catch(() => setLoading(false));

    return () => {
      isMounted = false;
    };
  }, [state]);

  // Filter by commodity
  const filteredRecords = commodity
    ? records.filter((r) => r.commodity === commodity)
    : records;

  return (
    <>
      <Navbar />
      <div style={{ padding: "20px", paddingTop: "90px" }}>
        <h2><TranslateText>Daily Market Prices</TranslateText></h2>

        {/* STATE SELECT */}
        <label>
          <TranslateText>State:</TranslateText>&nbsp;
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value=''><TranslateText>-- All States --</TranslateText></option>
            {INDIAN_STATES.map((s, idx) => (
              <option key={idx} value={s}>{s}</option>
            ))}
          </select>
        </label>

        &nbsp;&nbsp;

        {/* COMMODITY SELECT */}
        <label>
          <TranslateText>Commodity:</TranslateText>&nbsp;
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            disabled={!commodities.length}
          >
            <option value=""><TranslateText>-- All Commodities --</TranslateText></option>
            {commodities.map((c, idx) => (
              <option key={idx} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>


        <br /><br />
        {loading && <p>Loading...</p>}
        {/* TABLE */}
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th><TranslateText>State</TranslateText></th>
              <th><TranslateText>District</TranslateText></th>
              <th><TranslateText>Market</TranslateText></th>
              <th><TranslateText>Commodity</TranslateText></th>
              <th><TranslateText>Min Price Per 1 Quintal</TranslateText></th>
              <th><TranslateText>Max Price</TranslateText></th>
              <th><TranslateText>Modal Price</TranslateText></th>
              <th><TranslateText>Date</TranslateText></th>
            </tr>
          </thead>

          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="8" align="center">
                  <TranslateText>No data available</TranslateText>
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.state}</td>
                  <td>{r.district}</td>
                  <td>{r.market}</td>
                  <td>{r.commodity}</td>
                  <td>{r.min_price}</td>
                  <td>{r.max_price}</td>
                  <td>{r.modal_price}</td>
                  <td>{r.arrival_date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default MarketPrices;
