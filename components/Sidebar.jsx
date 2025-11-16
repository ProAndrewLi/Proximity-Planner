"use client";

import { useEffect, useState } from "react";
import { saveEvent, deleteEvent } from "../lib/events";

export default function Sidebar() {
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const date = new Date();
    const formatDate = date.toISOString().split('T')[0];
    setDate(formatDate);
    setTime("12:00");
  }, []);

  useEffect(() => {
    const selectHandler = (e) => {
      setSelectedEvent(e.detail);
      setMode("details");
    };

    const clearHandler = () => {
      setSelectedEvent(null);
      setMode("create");
    };

    window.addEventListener("eventSelected", selectHandler);
    window.addEventListener("clearDetails", clearHandler);

    return () => {
      window.removeEventListener("eventSelected", selectHandler);
      window.removeEventListener("clearDetails", clearHandler);
    };
  }, []);

  const tryCreate = () => {
    const last = JSON.parse(localStorage.getItem("lastClick") || "null");
    if (!last) return alert("Click the map first.");
    setMode("form");
  };

  const confirm = async () => {
    const last = JSON.parse(localStorage.getItem("lastClick"));
    const dateTime = `${date} ${time}`;
    const event = { name, org, time: dateTime, lat: last.lat, lon: last.lon };

    try {
      await saveEvent(event);
      setName("");
      setOrg("");
      const today = new Date();
      setDate(today.toISOString().split('T')[0]);
      setTime("12:00");
      window.location.reload();
    } catch (error) {
      alert("Failed to save event: " + error.message);
    }
  };

  const remove = async () => {
    if (!selectedEvent) return;

    if (!confirm("Delete this event?")) return;

    try {
      await deleteEvent(selectedEvent.id);

      // Tell map to remove marker
      window.dispatchEvent(
        new CustomEvent("eventDeleted", { detail: selectedEvent.id })
      );

      setSelectedEvent(null);
      setMode("create");
    } catch (err) {
      alert("Deletion failed: " + err.message);
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "Not specified";

    try {
      if (dateTimeStr.includes(' ')) {
        const [datePart, timePart] = dateTimeStr.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');

        const date = new Date(year, month - 1, day, hour, minute);
        return date.toLocaleString();
      }

      return new Date(dateTimeStr).toLocaleString();
    } catch (e) {
      return dateTimeStr;
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {mode === "create" && (
        <button
          onClick={tryCreate}
          style={{
            marginTop: "10%",
            width: "100%",
            padding: "15px",
            background: "black",
            color: "white",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        >
          Create Event
        </button>
      )}

      {mode === "form" && (
        <div>
          <h2>Create Event</h2>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Event Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Organization
            </label>
            <input
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
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
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Confirm
          </button>
        </div>
      )}

      {mode === "details" && selectedEvent && (
        <div>
          <h2>Event Info</h2>
          <p>
            <b>Name:</b> {selectedEvent.name}
          </p>
          <p>
            <b>Organization:</b> {selectedEvent.org}
          </p>
          <p>
            <b>Time:</b> {formatDateTime(selectedEvent.time)}
          </p>
          <p>
            <b>Location:</b> {selectedEvent.lat.toFixed(5)},{" "}
            {selectedEvent.lon.toFixed(5)}
          </p>

          <button
            onClick={remove}
            style={{
              marginTop: "30px",
              width: "100%",
              padding: "12px",
              background: "red",
              color: "white",
              borderRadius: "6px",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
            }}
          >
            Delete Event
          </button>
        </div>
      )}
    </div>
  );
}
