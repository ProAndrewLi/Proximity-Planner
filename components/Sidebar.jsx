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
  const [filteredEvents, setFilteredEvents] = useState(null);

  // Get today's date in local timezone without timezone conversion
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formatDate = `${year}-${month}-${day}`;
    
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

  // Handle date selection without timezone issues
  const handleDateSelect = (day) => {
    // Create date using local timezone components
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Format the date as YYYY-MM-DD without timezone conversion
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    setDate(formattedDate);
    setSelectedDate(formattedDate);
    setShowDatePicker(false);
  };

  // Check if day is today using local date
  const isToday = (day) => {
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const compareDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    return todayLocal.getTime() === compareDate.getTime();
  };

  // Check if day is selected using local date comparison
  const isSelected = (day) => {
    if (!selectedDate) return false;
    
    // Create dates for comparison using local timezone
    const [yearStr, monthStr, dayStr] = selectedDate.split('-').map(Number);
    const selectedDateLocal = new Date(yearStr, monthStr - 1, dayStr);
    const compareDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    return selectedDateLocal.getTime() === compareDate.getTime();
  };

  // Generate calendar days
  const calendarDays = [];
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

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

  useEffect(() => {
    const handler = (e) => {
      setFilteredEvents(e.detail);   // list of filtered events
    };

    window.addEventListener("filteredEvents", handler);

    return () => window.removeEventListener("filteredEvents", handler);
  }, []);

  // Close event details
  const closeDetails = () => {
    setSelectedEvent(null);
    setMode("create");
    // Also clear any map selection
    window.dispatchEvent(new CustomEvent("clearDetails"));
  };

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
      
      // Reset date without timezone issues
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayFormatted = `${year}-${month}-${day}`;
      
      setDate(todayFormatted);
      setSelectedDate(todayFormatted);
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

    // Parse the date string directly without timezone conversion
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

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
    <div className="sidebar">
      {/* Background overlay for pickers */}
      {(showDatePicker || showTimePicker) && (
        <div className="overlay" />
      )}

      <div className="sidebar-content">
        {/* CREATE BUTTON */}
        {mode === "create" && (
          <button className="create-btn" onClick={tryCreate}>
            Create Event
          </button>
        )}

        {/* NEARBY EVENTS LIST */}
        {mode === "create" && (
          <div className="nearby-events">
            <h3>Nearby Events</h3>

            {nearbyEvents.length === 0 && (
              <p className="no-events">No events available.</p>
            )}

            {(filteredEvents ?? nearbyEvents).map((ev) => (
              <div
                key={ev.id}
                className={`event-item ${selectedEvent?.id === ev.id ? 'selected' : ''}`}
                onClick={() => window.dispatchEvent(new CustomEvent("eventSelected", { detail: ev }))}
              >
                <div className="event-name">{ev.name}</div>
                <div className="event-distance">
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

        {/* CREATE EVENT FORM */}
        {mode === "form" && (
          <div className="form-container">
            <h2 className="form-title">Create New Event</h2>

            <div className="form-group">
              <label className="form-label">Event Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Organization</label>
              <input
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Custom Date Picker */}
            <div className="form-group date-picker-container">
              <label className="form-label">Date</label>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="picker-button"
              >
                {formatDateDisplay(date)}
                <span className="picker-arrow">▼</span>
              </button>

              {/* Fancy Calendar Popup */}
              {showDatePicker && (
                <div className="calendar-popup">
                  <div className="calendar-header">
                    <div className="calendar-nav">
                      <button onClick={() => navigateMonth(-1)} className="nav-button">
                        ‹
                      </button>
                      <div className="month-year">{formatMonthYear(currentMonth)}</div>
                      <button onClick={() => navigateMonth(1)} className="nav-button">
                        ›
                      </button>
                    </div>

                    <div className="day-headers">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="day-header">{day}</div>
                      ))}
                    </div>
                  </div>

                  <div className="calendar-days">
                    {calendarDays.map((day, index) => (
                      <div
                        key={index}
                        className={`calendar-day ${day ? '' : 'empty'} ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''}`}
                        onClick={() => day && handleDateSelect(day)}
                      >
                        {day || ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Time Picker */}
            <div className="form-group time-picker-container">
              <label className="form-label">Time</label>
              <button
                type="button"
                onClick={() => setShowTimePicker(!showTimePicker)}
                className="picker-button"
              >
                {formatTimeDisplay()}
                <span className="picker-arrow">▼</span>
              </button>

              {/* Custom Time Picker Popup */}
              {showTimePicker && (
                <div className="time-popup">
                  <div className="time-selectors">
                    <div className="time-selector">
                      <label className="time-label">Hour</label>
                      <select
                        value={hour}
                        onChange={(e) => setHour(e.target.value)}
                        className="time-select"
                      >
                        {hours.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="time-selector">
                      <label className="time-label">Minute</label>
                      <select
                        value={minute}
                        onChange={(e) => setMinute(e.target.value)}
                        className="time-select"
                      >
                        {minutes.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="time-selector">
                      <label className="time-label">AM/PM</label>
                      <select
                        value={ampm}
                        onChange={(e) => setAmPm(e.target.value)}
                        className="time-select"
                      >
                        {ampmOptions.map(ap => (
                          <option key={ap} value={ap}>{ap}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowTimePicker(false)}
                    className="set-time-btn"
                  >
                    Set Time
                  </button>
                </div>
              )}
            </div>

            <button onClick={confirm} className="confirm-btn">
              Confirm
            </button>
          </div>
        )}

        {/* EVENT DETAILS */}
        {mode === "details" && selectedEvent && (
          <div className="details-container">
            <div className="details-header">
              <h2 className="details-title">Event Details</h2>
              <button 
                className="close-button"
                onClick={closeDetails}
                aria-label="Close details"
              >
                ×
              </button>
            </div>
            <div className="event-details">
              <p><span className="detail-label">Name:</span> {selectedEvent.name}</p>
              <p><span className="detail-label">Organization:</span> {selectedEvent.org}</p>
              <p><span className="detail-label">Time:</span> {formatDateTime(selectedEvent.time)}</p>
              <p>
                <span className="detail-label">Location:</span> {selectedEvent.lat.toFixed(5)}, {selectedEvent.lon.toFixed(5)}
              </p>
            </div>

            <button onClick={remove} className="delete-btn">
              Delete Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}