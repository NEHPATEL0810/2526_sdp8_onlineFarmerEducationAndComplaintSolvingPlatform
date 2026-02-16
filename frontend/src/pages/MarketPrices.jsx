import { useEffect, useState } from "react";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Tag,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Database,
  Calendar,
  Filter,
  Loader2
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api/education/market-prices/";
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

function MarketPrices() {
  const [state, setState] = useState("");
  const [commodity, setCommodity] = useState("");
  const [records, setRecords] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("live"); // 'live' or 'csv'

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
        setSource(data.source || "csv");
        setLoading(false);

        const uniqueCommodities = [
          ...new Set(recs.map((r) => r.commodity)),
        ];
        setCommodities(uniqueCommodities);
        setCommodity("");
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [state]);

  // Filter by commodity
  const filteredRecords = commodity
    ? records.filter((r) => r.commodity === commodity)
    : records;

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-neutral-800 font-sans selection:bg-green-200">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-green-100 border border-green-200 text-green-700">
              <TrendingUp size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-green-800">
                <TranslateText>Daily Market Prices</TranslateText>
              </h1>
              <p className="text-neutral-500 mt-1">
                <TranslateText>Real-time agricultural commodity prices across India</TranslateText>
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── FILTERS ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-8"
        >
          <div className="flex flex-col md:flex-row gap-6 items-end">
            {/* State Select */}
            <div className="w-full md:w-1/3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <MapPin size={16} className="text-green-600" />
                <TranslateText>Select State</TranslateText>
              </label>
              <div className="relative">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-700 transition-all cursor-pointer hover:bg-gray-100"
                >
                  <option value=''><TranslateText>All States</TranslateText></option>
                  {INDIAN_STATES.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ArrowDown size={14} />
                </div>
              </div>
            </div>

            {/* Commodity Select */}
            <div className="w-full md:w-1/3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Tag size={16} className="text-green-600" />
                <TranslateText>Filter Commodity</TranslateText>
              </label>
              <div className="relative">
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  disabled={!commodities.length}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer hover:bg-gray-100"
                >
                  <option value=""><TranslateText>All Commodities</TranslateText></option>
                  {commodities.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Filter size={14} />
                </div>
              </div>
            </div>

            {/* Source Badge */}
            <div className="w-full md:w-auto ml-auto pb-1">
              {source === 'live' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <TranslateText>Live API</TranslateText>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold uppercase tracking-wider" title="Showing cached/dataset data due to API timeout">
                  <Database size={12} />
                  <TranslateText>Offline Dataset</TranslateText>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── DATA DISPLAY ─── */}
        <div className="relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-green-600" size={48} />
              <p className="text-gray-500 animate-pulse">
                <TranslateText>Fetching latest market prices...</TranslateText>
                <br />
                <span className="text-xs text-gray-400 block mt-2 text-center text-balance max-w-xs mx-auto">
                  (Wait up to 20s for live data)
                </span>
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border border-gray-200 border-dashed">
              <Search size={48} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600"><TranslateText>No data found</TranslateText></h3>
              <p className="text-gray-400 mt-2"><TranslateText>Try adjusting your filters or selecting a different state.</TranslateText></p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              <AnimatePresence>
                {filteredRecords.map((r, idx) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={idx}
                    className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-green-200 hover:shadow-xl hover:shadow-green-900/5 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <TrendingUp size={64} className="text-green-600" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 block">
                            {r.commodity}
                          </span>
                          <h3 className="font-bold text-gray-800 line-clamp-1" title={r.market}>
                            {r.market}
                          </h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin size={10} />
                            {r.district}, {sStateAbbr(r.state)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500"><TranslateText>Modal Price</TranslateText></span>
                          <span className="text-lg font-bold text-green-700">₹{r.modal_price}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <span className="text-gray-400 block mb-1">Min</span>
                            <span className="font-mono text-gray-700 font-medium">₹{r.min_price}</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <span className="text-gray-400 block mb-1">Max</span>
                            <span className="font-mono text-gray-700 font-medium">₹{r.max_price}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end pt-2 text-[10px] text-gray-400">
                          <Calendar size={10} />
                          <span>{r.arrival_date}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

// Helper to shorten state names if needed, or just return as is
function sStateAbbr(state) {
  return state;
}

export default MarketPrices;
