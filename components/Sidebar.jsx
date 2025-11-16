"use client";

import { useEffect, useState } from "react";
import { saveEvent, deleteEvent, getEvent } from "../lib/events.js";

export default function Sidebar() {
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [nearbyEvents, setNearbyEvents] = useState([]);
  
  useEffect(() => {
    const date = new Date();
    const formatDate = date.toISOString().split("T")[0];
    setDate(formatDate);
    setTime("12:00");
  }, []);

  // ---------------------------
  //   Load Events Sorted by Distance
  // ---------------------------
  useEffect(() => {
    const loadNearby = async () => {
      try {
        const events = await getEvent();

        if (!navigator.geolocation) {
          console.warn("No geolocation available.");
          setNearbyEvents(events); // unsorted fallback
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLat = pos.coords.latitude;
            const userLon = pos.coords.longitude;

            const sorted = events
              .map((ev) => ({
                ...ev,
                distance: haversine(userLat, userLon, ev.lat, ev.lon),
              }))
              .sort((a, b) => a.distance - b.distance);

            setNearbyEvents(sorted);
          },
          () => {
            console.warn("User denied location access.");
            setNearbyEvents(events);
          }
        );
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    };

    loadNearby();
  }, []);

  // Haversine distance in meters
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = (x) => (x * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const dφ = toRad(lat2 - lat1);
    const dλ = toRad(lon2 - lon1);

    const a =
      Math.sin(dφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // ---------------------------
  //   Event Selection / Cleanup
  // ---------------------------
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

  // ---------------------------
  //   Create Event
  // ---------------------------
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
      setDate(new Date().toISOString().split("T")[0]);
      setTime("12:00");
      window.location.reload();
    } catch (error) {
      alert("Failed to save event: " + error.message);
    }
  };

  // ---------------------------
  //   Delete Event
  // ---------------------------
  const remove = async () => {
    if (!selectedEvent) return;

    if (!window.confirm("Confirm deletion of this event?")) return;

    try {
      await deleteEvent(selectedEvent.id);

      window.dispatchEvent(
        new CustomEvent("eventDeleted", { detail: selectedEvent.id })
      );

      setSelectedEvent(null);
      setMode("create");
    } catch (err) {
      alert("Deletion failed: " + err.message);
    }
  };

  // ---------------------------
  //   Date Formatting
  // ---------------------------
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "Not specified";

    try {
      if (dateTimeStr.includes(" ")) {
        const [datePart, timePart] = dateTimeStr.split(" ");
        const [year, month, day] = datePart.split("-");
        const [hour, minute] = timePart.split(":");

        const date = new Date(year, month - 1, day, hour, minute);
        return date.toLocaleString();
      }

      return new Date(dateTimeStr).toLocaleString();
    } catch (e) {
      return dateTimeStr;
    }
  };

  // ---------------------------
  //   Render
  // ---------------------------
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {/* ------------------------------ */}
      {/* CREATE BUTTON */}
      {/* ------------------------------ */}
      {mode === "create" && (
        <button
          onClick={tryCreate}
          style={{
            marginTop: "3%",
            marginLeft: "5%",
            marginRight: "5%",
            width: "90%",
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

      {/* ------------------------------ */}
      {/* NEARBY EVENTS LIST */}
      {/* Show only in create mode */}
      {/* ------------------------------ */}
      {mode === "create" && (
        <div style={{ marginTop: "30px" }}>
          <h3>Nearby Events</h3>

          {nearbyEvents.length === 0 && (
            <p style={{ color: "#777" }}>No events available.</p>
          )}

          {nearbyEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("eventSelected", { detail: ev })
                )
              }
              style={{
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                marginBottom: "10px",
                cursor: "pointer",
                background: "#fafafa",
              }}
            >
              <b>{ev.name}</b>
              <div style={{ fontSize: "13px", color: "#555" }}>
                {ev.distance
                  ? ev.distance < 1000
                    ? `${Math.round(ev.distance)} m away`
                    : `${(ev.distance / 1000).toFixed(1)} km away`
                  : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------ */}
      {/* CREATE EVENT FORM */}
      {/* ------------------------------ */}
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
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", background: "white" }}
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
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      )}

      {/* ------------------------------ */}
      {/* EVENT DETAILS */}
      {/* ------------------------------ */}
      {mode === "details" && selectedEvent && (
        <div>
          <h2>Event Info</h2>
          <p><b>Name:</b> {selectedEvent.name}</p>
          <p><b>Organization:</b> {selectedEvent.org}</p>
          <p><b>Time:</b> {formatDateTime(selectedEvent.time)}</p>
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
