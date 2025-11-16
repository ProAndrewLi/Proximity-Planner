"use client";
import { useEffect, useRef } from "react";
import "ol/ol.css";
import * as ol from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Point from "ol/geom/Point";
import RegularShape from "ol/style/RegularShape";
import Circle from "ol/style/Circle";
import { fromLonLat, toLonLat } from "ol/proj";

import { getEvent } from "../lib/events.js";

export default function MapClient() {
  const mapRef = useRef(null);
  const clickVector = new VectorSource();
  const eventVector = new VectorSource();
  const userLocationSource = new VectorSource();

  let userLocation = null;
  let selectedEventId = null;
  let fullEventList = [];

  useEffect(() => {
    if (mapRef.current) return;

    /* --------------------------
     *  LAYERS
     * -------------------------- */
    const clickLayer = new VectorLayer({
      source: clickVector,
      style: pinStyle("red"),
    });

    const eventLayer = new VectorLayer({ source: eventVector });

    const userLocationLayer = new VectorLayer({
      source: userLocationSource,
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: "red" }),
          stroke: new Stroke({ color: "white", width: 2 }),
        }),
      }),
    });

    /* --------------------------
     *  MAP
     * -------------------------- */
    const map = new ol.Map({
      target: "map",
      layers: [
        new TileLayer({ source: new OSM() }),
        clickLayer,
        eventLayer,
        userLocationLayer,
      ],
      view: new View({
        center: fromLonLat([-73.6767, 42.72998]),
        zoom: 17,
      }),
    });

    /* --------------------------
     *  CLICK HANDLER
     * -------------------------- */
    map.on("click", (evt) => {
      const [lon, lat] = toLonLat(evt.coordinate);

      window.dispatchEvent(new CustomEvent("clearDetails"));
      localStorage.setItem("lastClick", JSON.stringify({ lon, lat }));

      let clickedEvent = null;

      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        if (feature.get("eventData")) clickedEvent = feature.get("eventData");
      });

      selectedEventId = clickedEvent ? clickedEvent.id : null;

      if (clickedEvent) {
        window.dispatchEvent(
          new CustomEvent("eventSelected", { detail: clickedEvent })
        );
      }

      renderEvents();
    });

    /* --------------------------
     *  LOAD EVENTS FROM FIRESTORE
     * -------------------------- */
    async function loadEvents() {
      try {
        fullEventList = await getEvent();
        renderEvents();
        window.dispatchEvent(
          new CustomEvent("filteredEvents", { detail: fullEventList })
        );
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    }

    loadEvents();

    /* --------------------------
     *  RENDER EVENTS
     * -------------------------- */
    function renderEvents(list = null) {
      const events = list ?? fullEventList;

      eventVector.clear();

      events.forEach((ev) => {
        const f = new ol.Feature({
          geometry: new Point(fromLonLat([ev.lon, ev.lat])),
        });

        f.set("eventData", ev);
        f.setId(ev.id);

        if (selectedEventId === ev.id) {
          f.setStyle(pinStyle("blue"));
        } else {
          f.setStyle(
            new Style({
              image: new CircleStyle({
                radius: 7,
                fill: new Fill({ color: "blue" }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
              }),
            })
          );
        }

        eventVector.addFeature(f);
      });
    }

    /* --------------------------
     *  SIDEBAR SELECTION
     * -------------------------- */
    function handleSidebarSelect(e) {
      const ev = e.detail;
      if (!ev) return;

      selectedEventId = ev.id;

      map.getView().animate({
        center: fromLonLat([ev.lon, ev.lat]),
        zoom: 18,
        duration: 300,
      });

      renderEvents();
    }

    window.addEventListener("eventSelected", handleSidebarSelect);

    /* --------------------------
     *  USER LOCATION
     * -------------------------- */
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        userLocation = [pos.coords.longitude, pos.coords.latitude];

        userLocationSource.clear();
        userLocationSource.addFeature(
          new ol.Feature({
            geometry: new Point(fromLonLat(userLocation)),
          })
        );

        map.getView().setCenter(fromLonLat(userLocation));
        map.getView().setZoom(17);
      });
      window.location.reload();
    }

    /* --------------------------
     *  HAVERSINE
     * -------------------------- */
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /* --------------------------
     *  FILTER BUTTON
     * -------------------------- */
    document.getElementById("applyDistance").onclick = () => {
      if (!userLocation) return;

      const km = parseFloat(document.getElementById("distanceInput").value);
      if (isNaN(km)) return;

      const filtered = fullEventList.filter((ev) => {
        const dist = haversine(
          userLocation[1],
          userLocation[0],
          ev.lat,
          ev.lon
        );
        return dist <= km;
      });

      renderEvents(filtered);

      window.dispatchEvent(
        new CustomEvent("filteredEvents", { detail: filtered })
      );
    };

    /* --------------------------
     *  RECENTER BUTTON
     * -------------------------- */
    document.getElementById("recenterBtn").onclick = () => {
      if (!userLocation) return;

      map.getView().animate({
        center: fromLonLat(userLocation),
        zoom: 17,
        duration: 300,
      });
    };

    /* --------------------------
     *  CLEANUP
     * -------------------------- */
    mapRef.current = map;

    return () =>
      window.removeEventListener("eventSelected", handleSidebarSelect);
  }, []);

  /* --------------------------
   * UI OVER THE MAP
   * -------------------------- */

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {/* SEPARATED UI CONTROLS */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 1000,
          background: "white",
          padding: "20px",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          border: "2px solid #e2e8f0",
          minWidth: "220px"
        }}
      >
        {/* Distance Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label
            htmlFor="distanceInput"
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#4a5568",
              marginBottom: "4px"
            }}
          >
            Max Distance (km)
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              id="distanceInput"
              type="number"
              placeholder="Enter km"
              min="0"
              step="0.1"
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: "10px",
                border: "2px solid #e2e8f0",
                fontSize: "14px",
                outline: "none",
                transition: "all 0.2s ease",
                background: "white",
                fontFamily: "'Inter', sans-serif"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              id="applyDistance"
              style={{
                padding: "12px 16px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                fontFamily: "'Inter', sans-serif"
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Recenter */}
        <button
          id="recenterBtn"
          style={{
            padding: "14px 16px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
            fontFamily: "'Inter', sans-serif"
          }}
          onMouseOver={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
          }}
          onMouseOut={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
          }}
        >
          Recenter to My Location
        </button>
      </div>

      <div id="map" style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

/* --------------------------
 * PIN STYLE
 * -------------------------- */
function pinStyle(color) {
  return [
    new Style({
      image: new Circle({
        radius: 8.5,
        fill: new Fill({ color }),
        displacement: [0, 16],
      }),
    }),
    new Style({
      image: new RegularShape({
        points: 3,
        radius: 10,
        displacement: [0, -10],
        rotation: Math.PI,
        fill: new Fill({ color }),
      }),
    }),
    new Style({
      image: new Circle({
        radius: 4,
        fill: new Fill({ color: "white" }),
        displacement: [0, 16],
      }),
    }),
  ];
}
