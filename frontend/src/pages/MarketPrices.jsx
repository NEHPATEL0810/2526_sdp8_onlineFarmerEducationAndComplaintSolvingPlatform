import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000/api/education/market-prices/";

function MarketPrices() {
  const [state, setState] = useState("");
  const [commodity, setCommodity] = useState("");
  const [records, setRecords] = useState([]);
  const [commodities, setCommodities] = useState([]);

  // Fetch data when state changes
  useEffect(() => {
    if (!state) return;

    fetch(`${API_URL}?state=${state}&limit=200`)
      .then((res) => res.json())
      .then((data) => {
        const recs = data.records || [];
        setRecords(recs);

        // extract unique commodities for dropdown
        const uniqueCommodities = [
          ...new Set(recs.map((r) => r.commodity)),
        ];
        setCommodities(uniqueCommodities);
        setCommodity("");
      });
  }, [state]);

  // Filter by commodity
  const filteredRecords = commodity
    ? records.filter((r) => r.commodity === commodity)
    : records;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Daily Market Prices</h2>

      {/* STATE SELECT */}
      <label>
        State:&nbsp;
        <select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">-- Select State --</option>
          <option value="Gujarat">Gujarat</option>
          <option value="Maharashtra">Maharashtra</option>
          <option value="Rajasthan">Rajasthan</option>
          <option value="Punjab">Punjab</option>
          <option value="Haryana">Haryana</option>
        </select>
      </label>

      &nbsp;&nbsp;

      {/* COMMODITY SELECT */}
      <label>
        Commodity:&nbsp;
        <select
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
          disabled={!commodities.length}
        >
          <option value="">-- All Commodities --</option>
          {commodities.map((c, idx) => (
            <option key={idx} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <br /><br />

      {/* TABLE */}
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>State</th>
            <th>District</th>
            <th>Market</th>
            <th>Commodity</th>
            <th>Min Price</th>
            <th>Max Price</th>
            <th>Modal Price</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {filteredRecords.length === 0 ? (
            <tr>
              <td colSpan="8" align="center">
                No data available
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
  );
}

export default MarketPrices;
