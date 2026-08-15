import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";

// Clean up standard Leaflet marker icon asset paths which can get scrambled during bundler compilation
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Severity Colors for markers
const SEVERITY_COLORS = {
  Low: "#3b82f6",       // Blue
  Medium: "#f59e0b",    // Orange
  High: "#ef4444",      // Red
  Critical: "#7f1d1d",  // Dark Red
};

export default function LeafletMap({ complaints, onViewComplaint, onSupportComplaint, center = [12.935, 77.624], zoom = 13, selectable = false, onSelectLocation }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerGroupRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const [selectedCoords, setSelectedCoords] = useState(center);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current).setView(center, zoom);
    mapRef.current = map;

    // Load OpenStreetMap tiles with attribution
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Create marker layer group
    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.value = markerGroup;
    markerGroupRef.current = markerGroup;

    // Setup click listener for location selection (only in Report Issue wizard mode)
    if (selectable) {
      const selectMarker = L.marker(center, { draggable: true }).addTo(map);
      selectedMarkerRef.current = selectMarker;

      selectMarker.on("dragend", () => {
        const position = selectMarker.getLatLng();
        setSelectedCoords([position.lat, position.lng]);
        if (onSelectLocation) {
          onSelectLocation(position.lat, position.lng);
        }
      });

      map.on("click", (e) => {
        selectMarker.setLatLng(e.latlng);
        setSelectedCoords([e.latlng.lat, e.latlng.lng]);
        if (onSelectLocation) {
          onSelectLocation(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    // Teardown map on component unmount to prevent container conflict
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selectable]);

  // Update Markers when complaints list changes
  useEffect(() => {
    if (!mapRef.current || selectable) return;

    const markerGroup = markerGroupRef.current;
    if (!markerGroup) return;

    // Clear existing markers
    markerGroup.clearLayers();

    // Plot new markers
    complaints.forEach((c) => {
      if (!c.latitude || !c.longitude) return;

      const markerColor = SEVERITY_COLORS[c.severity] || "#64748b";
      
      // Use circle markers for status coloring / visual neatness
      const circleMarker = L.circleMarker([c.latitude, c.longitude], {
        radius: 10,
        fillColor: markerColor,
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(markerGroup);

      // Bind dynamic Popup details
      const popupContent = document.createElement("div");
      popupContent.className = "p-2 font-sans min-w-[200px]";
      
      const badgeStyle = `
        px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase
        ${c.status === "Closed" ? "bg-slate-100 text-slate-700" : ""}
        ${c.status === "Resolved" ? "bg-emerald-100 text-emerald-800" : ""}
        ${c.status === "In_Progress" ? "bg-blue-100 text-blue-800" : ""}
        ${c.status === "Assigned" ? "bg-indigo-100 text-indigo-800" : ""}
        ${c.status === "Reopened" ? "bg-amber-100 text-amber-800" : ""}
      `;

      popupContent.innerHTML = `
        <div class="flex justify-between items-center mb-1">
          <span class="text-xs font-bold text-slate-500">${c.complaint_code}</span>
          <span class="${badgeStyle}">${c.status.replace("_", " ")}</span>
        </div>
        <h4 class="text-sm font-bold text-slate-800 mb-0.5">${c.category}</h4>
        <p class="text-xs text-slate-500 mb-2 truncate">${c.address}</p>
        <div class="text-[11px] text-slate-600 mb-2 flex items-center justify-between">
          <span>Severity: <strong style="color: ${markerColor}">${c.severity}</strong></span>
          <span>Votes: <strong>${c.support_count}</strong></span>
        </div>
        <div class="flex gap-2">
          <button id="view-btn-${c.id}" class="flex-1 text-center bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-semibold py-1 px-2 rounded transition">
            View Details
          </button>
        </div>
      `;

      circleMarker.bindPopup(popupContent);

      // Attach button actions when popup is displayed
      circleMarker.on("popupopen", () => {
        const viewBtn = document.getElementById(`view-btn-${c.id}`);
        if (viewBtn) {
          viewBtn.onclick = () => {
            circleMarker.closePopup();
            onViewComplaint(c.id);
          };
        }
      });
    });
  }, [complaints, selectable]);

  return (
    <div className="relative w-full h-full bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" style={{ zIndex: 1 }} />
      {selectable && (
        <div className="absolute bottom-2 left-2 z-[999] bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-sm font-medium text-slate-700">
          📍 Drag the marker or click map to pinpoint GPS coordinates: 
          <div className="font-mono text-brand-700 text-[10px] mt-0.5">
            {selectedCoords[0].toFixed(5)}, {selectedCoords[1].toFixed(5)}
          </div>
        </div>
      )}
    </div>
  );
}
