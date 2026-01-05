import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000/api/education/market-prices/";

function MarketPrices() {
  const [state, setState] = useState("");
  const [commodity, setCommodity] = useState("");
  const [records, setRecords] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state) {
      setRecords([]);
      setCommodities([]);
      return;
    }

    setLoading(true);

    fetch(`${API_URL}?state=${state}`)
      .then((res) => res.json())
      .then((data) => {
        const recs = data.records || [];
        setRecords(recs);
        setCommodities([...new Set(recs.map(r => r.commodity))]);
        setCommodity("");
      })
      .catch(() => {
        setRecords([]);
        setCommodities([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [state]);

  const filteredRecords = commodity
    ? records.filter(r => r.commodity === commodity)
    : records;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Daily Market Prices</h2>

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

      <label>
        Commodity:&nbsp;
        <select
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
          disabled={!commodities.length}
        >
          <option value="">-- All Commodities --</option>
          {commodities.map((c, idx) => (
            <option key={idx} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <br /><br />

      {loading && <p>Loading...</p>}

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
          {!loading && filteredRecords.length === 0 ? (
            <tr>
              <td colSpan="8" align="center">No data available</td>
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
