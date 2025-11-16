"use client";

import { useEffect, useState } from "react";
import { saveEvent, deleteEvent, getEvent } from "../lib/events.js";

export default function Sidebar() {
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmPm] = useState("PM");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [nearbyEvents, setNearbyEvents] = useState([]);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const ampmOptions = ['AM', 'PM'];

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const today = new Date();
    const formatDate = today.toISOString().split("T")[0];
    setDate(formatDate);
    setSelectedDate(formatDate);
  }, []);

  // Calendar functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDateSelect = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const formattedDate = newDate.toISOString().split("T")[0];
    setDate(formattedDate);
    setSelectedDate(formattedDate);
    setShowDatePicker(false);
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    return (
      day === selected.getDate() &&
      currentMonth.getMonth() === selected.getMonth() &&
      currentMonth.getFullYear() === selected.getFullYear()
    );
  };

  // Generate calendar days
  const calendarDays = [];
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // ---------------------------
  //   Load Events Sorted by Distance
  // ---------------------------
  useEffect(() => {
    const loadNearby = async () => {
      try {
        const events = await getEvent();

        if (!navigator.geolocation) {
          console.warn("No geolocation available.");
          setNearbyEvents(events);
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
    // Convert to 24-hour format for storage
    let hour24 = parseInt(hour);
    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    const time24 = `${hour24.toString().padStart(2, '0')}:${minute}`;
    const dateTime = `${date} ${time24}`;
    const event = { name, org, time: dateTime, lat: last.lat, lon: last.lon };

    try {
      await saveEvent(event);
      setName("");
      setOrg("");
      const today = new Date();
      setDate(today.toISOString().split("T")[0]);
      setSelectedDate(today.toISOString().split("T")[0]);
      setHour("12");
      setMinute("00");
      setAmPm("PM");
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

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "Select Date";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTimeDisplay = () => {
    return `${hour}:${minute} ${ampm}`;
  };

  // ---------------------------
  //   Render
  // ---------------------------
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {/* Background overlay for pickers */}
      {(showDatePicker || showTimePicker) && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 10
        }} />
      )}

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
            border: "none",
            cursor: "pointer"
          }}
        >
          Create Event
        </button>
      )}

      {/* ------------------------------ */}
      {/* NEARBY EVENTS LIST */}
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
                background: "#fafafa"
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

          {/* Custom Date Picker */}
          <div style={{ marginBottom: "15px", position: "relative" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Date
            </label>

            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                background: "white",
                fontSize: "16px",
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              {formatDateDisplay(date)}
              <span style={{ float: "right", color: "#666" }}>📅</span>
            </button>

            {/* Fancy Calendar Popup */}
            {showDatePicker && (
              <div style={{
                position: "absolute",
                width: "100%",
                background: "white",
                border: "2px solid #0070f3",
                borderRadius: "8px",
                marginTop: "5px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 20,
                overflow: "hidden"
              }}>
                {/* Calendar Header */}
                <div style={{
                  background: "#0070f3",
                  color: "white",
                  padding: "15px",
                  textAlign: "center"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px"
                  }}>
                    <button
                      onClick={() => navigateMonth(-1)}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "none",
                        color: "white",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        cursor: "pointer"
                      }}
                    >
                      ‹
                    </button>
                    <div style={{
                      fontSize: "16px",
                      fontWeight: "600"
                    }}>
                      {formatMonthYear(currentMonth)}
                    </div>
                    <button
                      onClick={() => navigateMonth(1)}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "none",
                        color: "white",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        cursor: "pointer"
                      }}
                    >
                      ›
                    </button>
                  </div>

                  {/* Day headers */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "2px",
                    fontSize: "12px",
                    opacity: "0.9"
                  }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                      <div key={day} style={{ textAlign: "center", padding: "5px 0" }}>
                        {day}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calendar Days */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "2px",
                  padding: "10px",
                  background: "white"
                }}>
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      style={{
                        textAlign: "center",
                        padding: "8px 0",
                        borderRadius: "4px",
                        cursor: day ? "pointer" : "default",
                        background: day ? (
                          isSelected(day)
                            ? "#0070f3"
                            : isToday(day)
                              ? "#e6f3ff"
                              : "transparent"
                        ) : "transparent",
                        color: day ? (
                          isSelected(day)
                            ? "white"
                            : isToday(day)
                              ? "#0070f3"
                              : "#333"
                        ) : "transparent",
                        fontWeight: isToday(day) || isSelected(day) ? "600" : "400"
                      }}
                      onClick={() => day && handleDateSelect(day)}
                      onMouseOver={(e) => {
                        if (day && !isSelected(day)) {
                          e.target.style.background = "#f0f0f0";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (day && !isSelected(day)) {
                          e.target.style.background = isToday(day) ? "#e6f3ff" : "transparent";
                        }
                      }}
                    >
                      {day || ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom Time Picker */}
          <div style={{ marginBottom: "20px", position: "relative" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Time
            </label>

            <button
              type="button"
              onClick={() => setShowTimePicker(!showTimePicker)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                background: "white",
                fontSize: "16px",
                textAlign: "left",
                cursor: "pointer"
              }}
            >
              {formatTimeDisplay()}
              <span style={{ float: "right", color: "#666" }}>⏰</span>
            </button>

            {/* Custom Time Picker Popup */}
            {showTimePicker && (
              <div style={{
                position: "absolute",
                width: "100%",
                background: "white",
                border: "2px solid #0070f3",
                borderRadius: "8px",
                marginTop: "5px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 20,
                overflow: "hidden",
                padding: "15px"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px"
                }}>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "600",
                      color: "#333",
                      fontSize: "14px"
                    }}>
                      Hour
                    </label>
                    <select
                      value={hour}
                      onChange={(e) => setHour(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        background: "white",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      {hours.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "600",
                      color: "#333",
                      fontSize: "14px"
                    }}>
                      Minute
                    </label>
                    <select
                      value={minute}
                      onChange={(e) => setMinute(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        background: "white",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      {minutes.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: "600",
                      color: "#333",
                      fontSize: "14px"
                    }}>
                      AM/PM
                    </label>
                    <select
                      value={ampm}
                      onChange={(e) => setAmPm(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        background: "white",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      {ampmOptions.map(ap => (
                        <option key={ap} value={ap}>{ap}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setShowTimePicker(false)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#0070f3",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}
                >
                  Set Time
                </button>
              </div>
            )}
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
              border: "none"
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
              border: "none"
            }}
          >
            Delete Event
          </button>
        </div>
      )}
    </div>
  );
}