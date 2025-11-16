
"use client";

import { useState } from "react";
import { saveEvent } from "../lib/events";

export default function Sidebar() {
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [time, setTime] = useState("");

  const tryCreate = () => {
    const last = JSON.parse(localStorage.getItem("lastClick") || "null");
    if (!last) {
      alert("Click the map first to choose a location.");
      return;
    }
    setMode("form");
  };

  const confirm = () => {
    const last = JSON.parse(localStorage.getItem("lastClick"));
    saveEvent({
      name,
      org,
      time,
      lat: last.lat,
      lon: last.lon,
    });

    setName("");
    setOrg("");
    setTime("");
    setMode("create");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {mode === "create" && (
        <button 
          onClick={tryCreate} 
          style={{
            marginTop: "40%",
            width: "100%",
            padding: "15px",
            background: "black",
            color: "white",
            borderRadius: "8px",
            border: "none",
            fontSize: "16px",
            cursor: "pointer"
          }}
        >
          Create Event
        </button>
      )}

      {mode === "form" && (
        <div>
          <h2>Create Event</h2>
          <div>
            <label>Name</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
          <div>
            <label>Organization</label>
            <input value={org} onChange={(e)=>setOrg(e.target.value)} />
          </div>
          <div>
            <label>Time Slot</label>
            <input value={time} onChange={(e)=>setTime(e.target.value)} />
          </div>

          <button 
            onClick={confirm}
            style={{
              marginTop: "20px",
              width: "100%",
              padding: "10px",
              background: "#0070f3",
              color: "white",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Confirm Event
          </button>
        </div>
      )}
    </div>
  );
}
