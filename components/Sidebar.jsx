"use client";

import { useEffect, useState } from "react";
import { saveEvent } from "../lib/events";

export default function Sidebar() {
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [time, setTime] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    window.addEventListener("eventSelected", (e) => {
      setSelectedEvent(e.detail);
      setMode("details");
    });

    window.addEventListener("clearDetails", () => {
      setSelectedEvent(null);
      setMode("create");
    });
  }, []);

  const tryCreate = () => {
    const last = JSON.parse(localStorage.getItem("lastClick") || "null");
    if (!last) return alert("Click the map first.");
    setMode("form");
  };

  const confirm = () => {
    const last = JSON.parse(localStorage.getItem("lastClick"));
    const event = { name, org, time, lat: last.lat, lon: last.lon };

    saveEvent(event);

    // refresh
    window.location.reload();
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {mode === "create" && (
        <button
          onClick={tryCreate}
          style={{ marginTop: "50%", width: "100%", padding: "15px", background: "black", color: "white", borderRadius: "8px", fontSize: "16px" }}
        >Create Event</button>
      )}

      {mode === "form" && (
        <div>
          <h2>Create Event</h2>
          <div><label>Name</label><input value={name} onChange={(e)=>setName(e.target.value)} /></div>
          <div><label>Organization</label><input value={org} onChange={(e)=>setOrg(e.target.value)} /></div>
          <div><label>Time Slot</label><input value={time} onChange={(e)=>setTime(e.target.value)} /></div>

          <button onClick={confirm} style={{ marginTop: "20px", width: "100%", padding: "10px", background: "#0070f3", color: "white", borderRadius: "6px" }}>Confirm</button>
        </div>
      )}

      {mode === "details" && selectedEvent && (
        <div>
          <h2>Event Info</h2>
          <p><b>Name:</b> {selectedEvent.name}</p>
          <p><b>Organization:</b> {selectedEvent.org}</p>
          <p><b>Time:</b> {selectedEvent.time}</p>
          <p><b>Location:</b> {selectedEvent.lat.toFixed(5)}, {selectedEvent.lon.toFixed(5)}</p>
        </div>
      )}
    </div>
  );
}