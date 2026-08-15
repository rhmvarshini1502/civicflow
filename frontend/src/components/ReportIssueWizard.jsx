import React, { useState, useEffect } from "react";
import { api } from "../api";
import LeafletMap from "./LeafletMap";
import { 
  Camera, MapPin, Edit3, Cpu, CheckCircle, 
  ArrowRight, ArrowLeft, Loader2, AlertCircle, 
  ThumbsUp, Sparkles, Building2, Flame
} from "lucide-react";

export default function ReportIssueWizard({ onNavigate, onRefreshProfile }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form Fields
  const [imageUrl, setImageUrl] = useState("");
  const [latitude, setLatitude] = useState(12.935);
  const [longitude, setLongitude] = useState(77.624);
  const [address, setAddress] = useState("Koramangala, Bengaluru");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Pothole"); // default draft category

  // Duplicates & AI state
  const [duplicates, setDuplicates] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [submittedCode, setSubmittedCode] = useState("");

  // Retrieve Browser Coordinates on Mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          // Try to get a mock address for current coordinates
          setAddress(`Lat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)} (GPS Location)`);
        },
        (err) => {
          console.warn("Geolocation access denied, falling back to city center default.");
        }
      );
    }
  }, []);

  // Sample photos for quick testing/demoing
  const SAMPLE_EVIDENCE = {
    Pothole: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23666'/><circle cx='200' cy='150' r='60' fill='%23222'/><path d='M160 120 L240 180 M240 120 L160 180' stroke='%23444' stroke-width='8'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>EVIDENCE: Pothole &amp; Cracks</text></svg>",
    Garbage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%238a7c6a'/><path d='M100 200 L150 120 L200 210 L250 150 L300 230' stroke='%233a3024' stroke-width='10' fill='none'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>EVIDENCE: Garbage Heap</text></svg>",
    Streetlight: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23111222'/><line x1='200' y1='50' x2='200' y2='250' stroke='%23444' stroke-width='6'/><circle cx='200' cy='50' r='20' fill='%23444'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>EVIDENCE: Broken Streetlight</text></svg>",
    "Water Leakage": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%234b6b80'/><path d='M0 150 Q100 100 200 150 T400 150' fill='none' stroke='%237ec0ee' stroke-width='6'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>EVIDENCE: Water Leakage</text></svg>",
    Drainage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%234a5d4e'/><circle cx='200' cy='220' r='40' fill='%23151c16'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>EVIDENCE: Overflowing Drain</text></svg>"
  };

  // Image upload to base64 Data URL with canvas-based compression & fallback
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setImageUrl(compressedBase64);
        } catch (err) {
          // If canvas fails, fallback to raw reader result
          setImageUrl(event.target.result);
        }
      };
      img.onerror = () => {
        setError("Failed to decode image file. Try selecting a JPEG/PNG file or use a sample photo.");
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Convert raw category for duplicate checking
  const checkDuplicates = async () => {
    try {
      setLoading(true);
      const res = await api.checkDuplicate(category, latitude, longitude);
      if (res.has_duplicate) {
        setDuplicates(res.duplicates);
      } else {
        setDuplicates([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger duplicate check when leaving location step
  const handleNextStep2 = async () => {
    await checkDuplicates();
    setStep(3);
  };

  // Run AI analysis
  const runAI = async () => {
    if (!description.trim()) {
      setError("Please describe the issue to run AI classification.");
      return;
    }
    setError("");
    try {
      setLoading(true);
      const res = await api.analyzeAI(description, imageUrl, latitude, longitude);
      setAiAnalysis(res);
      setStep(4);
    } catch (err) {
      setError("AI analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Final submit
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const data = {
        category: aiAnalysis?.category || category,
        description,
        latitude,
        longitude,
        address,
        image_url: imageUrl || undefined
      };
      
      const res = await api.createComplaint(data);
      setSubmittedCode(res.complaint_code);
      onRefreshProfile(); // Add points
      setStep(5);
    } catch (err) {
      setError("Submission failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Support/Upvote existing duplicate instead of creating a new complaint
  const handleSupportDuplicate = async (dupId) => {
    try {
      setLoading(true);
      await api.supportComplaint(dupId);
      onRefreshProfile();
      alert("Thank you! You have supported this existing report. Your contribution score is updated.");
      onNavigate("dashboard");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render step title
  const getStepTitle = () => {
    switch (step) {
      case 1: return "Upload Photo Evidence";
      case 2: return "Pinpoint Location";
      case 3: return "Describe the Issue";
      case 4: return "Review AI Analysis";
      case 5: return "Submission Complete";
      default: return "";
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      {/* Step Tracker Indicator */}
      {step < 5 && (
        <div className="mb-8 flex items-center justify-between">
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex items-center flex-1 last:flex-initial">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition duration-300 ${
                step === num ? "bg-brand-600 text-white shadow-md shadow-brand-600/10" :
                step > num ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {num}
              </div>
              {num < 4 && (
                <div className={`h-1 flex-1 mx-2 rounded ${step > num ? "bg-emerald-500" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main card panel */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 sm:p-8">
        {step < 5 && (
          <h2 className="text-xl font-bold font-outfit text-slate-800 mb-6 flex items-center gap-2">
            <span className="text-brand-600 bg-brand-50 px-2 py-1 rounded-lg text-xs">Step {step} of 4</span>
            {getStepTitle()}
          </h2>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD EVIDENCE */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase">Upload Evidence Photo</label>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 bg-slate-50 relative group transition-colors min-h-[160px]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  id="evidence-file-input"
                />
                
                {imageUrl ? (
                  <div className="flex flex-col items-center gap-3 z-20">
                    <img
                      src={imageUrl}
                      alt="Evidence preview"
                      className="max-h-52 object-contain rounded-xl border border-slate-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl("");
                      }}
                      className="text-xs bg-red-50 text-red-600 hover:bg-red-100 font-semibold px-3 py-1 rounded-lg transition"
                    >
                      Clear Image
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Click or drag & drop a photo here</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, WebP images</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Sample Photo Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Sample Evidence Photos:</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SAMPLE_EVIDENCE).map(([name, svgData]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setImageUrl(svgData);
                      setCategory(name === "Water Leakage" ? "Water Leakage" : name);
                      setError("");
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition ${
                      imageUrl === svgData 
                        ? "bg-brand-600 text-white border-brand-600 shadow-sm" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    + Sample {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Image URL fallback input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Or Paste Image URL</label>
              <input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setError("");
                }}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>

            {/* Category draft input (helps duplicate check lookups later) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Rough Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              >
                <option value="Pothole">Pothole</option>
                <option value="Garbage">Garbage Accumulation</option>
                <option value="Streetlight">Broken Streetlight</option>
                <option value="Water Leakage">Water Leakage</option>
                <option value="Drainage">Drainage Overflow</option>
                <option value="Open Manhole">Open Manhole</option>
                <option value="Traffic Signal">Broken Traffic Signal</option>
                <option value="Road Damage">Road Damage</option>
                <option value="Illegal Dumping">Illegal Dumping</option>
                <option value="Other">Other Infrastructure Problem</option>
              </select>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">
                {imageUrl ? "✓ Photo attached" : "Photo optional — you can proceed with description only"}
              </span>
              <button
                onClick={() => setStep(2)}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1 shadow-lg shadow-brand-600/10 transition active:scale-95"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: LOCATION */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="h-72 w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200">
              <LeafletMap
                center={[latitude, longitude]}
                selectable={true}
                onSelectLocation={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Estimated Address/Descriptor</label>
              <input
                type="text"
                placeholder="Enter nearby landmarks or street name..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleNextStep2}
                disabled={loading}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1 shadow-lg transition active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next Step"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DESCRIPTION & DUPLICATE CHECKS */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            {/* DUPLICATE DETECTION BOX */}
            {duplicates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-2.5 text-amber-900">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold font-outfit">Similar Issue Reported Nearby!</h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Citizens have already reported a <strong>{category}</strong> issue within 150m of your location. Supporting it creates stronger public impact.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {duplicates.map((dup) => (
                    <div key={dup.id} className="bg-white border border-amber-100 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-700">{dup.complaint_code}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase">{dup.status}</span>
                        </div>
                        <p className="text-[11px] text-slate-800 font-semibold truncate mt-1">{dup.category}</p>
                        <p className="text-[10px] text-slate-400 truncate">{dup.address}</p>
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          📍 Approx. {dup.distance_approx_m}m away • {dup.support_count} supports
                        </div>
                      </div>

                      <button
                        onClick={() => handleSupportDuplicate(dup.id)}
                        disabled={loading}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center gap-1 transition flex-shrink-0"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Support This
                      </button>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] text-amber-700 italic">
                  *If your issue is completely distinct, you can proceed by writing the description below.
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Describe the Problem</label>
              <textarea
                placeholder="Give details about the issue. Include size, location details, hazards, or specific context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 min-h-[120px] transition"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={runAI}
                disabled={loading || !description.trim()}
                className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-brand-500/10 transition active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Report...
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" /> AI Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW AI ANALYSIS */}
        {step === 4 && aiAnalysis && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-brand-100 p-1.5 rounded-lg text-brand-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 font-outfit">AI Classification Results</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-xl border border-brand-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Category</span>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{aiAnalysis.category}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-brand-100 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Severity</span>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">{aiAnalysis.severity}</div>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full ${
                    aiAnalysis.severity === "Critical" ? "bg-red-950" :
                    aiAnalysis.severity === "High" ? "bg-red-500" :
                    aiAnalysis.severity === "Medium" ? "bg-amber-500" : "bg-blue-500"
                  }`} />
                </div>
                <div className="bg-white p-3 rounded-xl border border-brand-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Suggested Department</span>
                    <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {aiAnalysis.suggested_department}
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-brand-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Priority Score</span>
                    <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      {aiAnalysis.priority} / 100
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-brand-100">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">AI Summary</span>
                <p className="text-xs text-slate-700 leading-relaxed mt-1">{aiAnalysis.summary}</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              *The AI automatically routed your complaint based on the description and photo keywords. You can submit now or go back to edit the description.
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(3)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Submit"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUBMISSION COMPLETE */}
        {step === 5 && (
          <div className="text-center py-8 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm shadow-emerald-100">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold font-outfit text-slate-800">Complaint Filed Successfully!</h2>
              <p className="text-xs text-slate-500 mt-2">
                Your report has been received and routed. Status changes will trigger alerts.
              </p>
            </div>

            <div className="bg-slate-50 border rounded-2xl p-5 max-w-sm mx-auto">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Complaint Reference Code</span>
              <div className="text-lg font-mono font-extrabold text-brand-900 mt-1 select-all">{submittedCode}</div>
              <div className="text-[10px] text-emerald-600 font-bold mt-2">🎉 +15 XP Contribution Score Awarded!</div>
            </div>

            <div className="pt-6 border-t max-w-md mx-auto flex gap-4">
              <button
                onClick={() => onNavigate("dashboard")}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition active:scale-95"
              >
                Go to My Dashboard
              </button>
              <button
                onClick={() => {
                  setImageUrl("");
                  setDescription("");
                  setAiAnalysis(null);
                  setStep(1);
                }}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3 px-4 rounded-xl text-xs transition"
              >
                Report Another Issue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
