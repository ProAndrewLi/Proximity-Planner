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

  useEffect(() => {
    if (mapRef.current) return;

    /* --------------------------
     *  MAP INIT
     * -------------------------- */
    const clickLayer = new VectorLayer({
      source: clickVector,
      style: pinStyle("red"),
    });

    const eventLayer = new VectorLayer({
      source: eventVector,
    });

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
      const coord = evt.coordinate;
      const [lon, lat] = toLonLat(coord);

      window.dispatchEvent(new CustomEvent("clearDetails"));
      localStorage.setItem("lastClick", JSON.stringify({ lon, lat }));

      let clickedEvent = null;

      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        if (feature.get("eventData")) {
          clickedEvent = feature.get("eventData");
        }
      });

      if (clickedEvent) {
        selectedEventId = clickedEvent.id;
        window.dispatchEvent(
          new CustomEvent("eventSelected", { detail: clickedEvent })
        );
      } else {
        selectedEventId = null;
      }

      renderEvents(); // Update event marker styles
    });

    /* --------------------------
     *  LOAD EVENTS FROM FIRESTORE
     * -------------------------- */
    async function loadEvents() {
      try {
        const events = await getEvent();

        localStorage.setItem("events", JSON.stringify(events));
        renderEvents();

        console.log("Loaded events:", events.length);
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    }

    loadEvents();

    /* --------------------------
     *  EVENT RE-RENDER FUNCTION
     * -------------------------- */
    function renderEvents(filteredList = null) {
      const events = filteredList || JSON.parse(localStorage.getItem("events") || "[]");

      eventVector.clear();

      events.forEach((ev) => {
        const f = new ol.Feature({
          geometry: new Point(fromLonLat([ev.lon, ev.lat])),
        });

        f.setId(ev.id);
        f.set("eventData", ev);

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
     *  SIDEBAR CLICK HANDLER
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
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lon = pos.coords.longitude;
          const lat = pos.coords.latitude;

          userLocation = [lon, lat];

          userLocationSource.clear();
          userLocationSource.addFeature(
            new ol.Feature({
              geometry: new Point(fromLonLat([lon, lat])),
            })
          );

          map.getView().setCenter(fromLonLat([lon, lat]));
          map.getView().setZoom(17);
        },
        () => console.warn("User denied geolocation")
      );
    }

    /* --------------------------
     *  DISTANCE FILTER UI
     * -------------------------- */
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) ** 2;

      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const applyDistanceBtn = document.getElementById("applyDistance");
    const distanceInput = document.getElementById("distanceInput");
    const recenterBtn = document.getElementById("recenterBtn");

    applyDistanceBtn.onclick = () => {
      if (!userLocation) return;

      const km = parseFloat(distanceInput.value);
      if (isNaN(km)) return;

      const events = JSON.parse(localStorage.getItem("events") || "[]");

      const filtered = events.filter((ev) => {
        const d = haversine(userLocation[1], userLocation[0], ev.lat, ev.lon);
        return d <= km;
      });

      renderEvents(filtered);

      window.dispatchEvent(
        new CustomEvent("filteredEvents", { detail: filtered })
      );
    };

    recenterBtn.onclick = () => {
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

    return () => {
      window.removeEventListener("eventSelected", handleSidebarSelect);
    };
  }, []);

  /* --------------------------
   * UI + MAP RENDER
   * -------------------------- */
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      
      {/* UI OVERLAY */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          zIndex: 1000,
          background: "white",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div>
          <input
            id="distanceInput"
            type="number"
            placeholder="Distance (km)"
            style={{ width: "120px", padding: "5px" }}
          />
          <button id="applyDistance" style={{ marginLeft: "5px", padding: "5px" }}>
            Apply
          </button>
        </div>

        <button id="recenterBtn" style={{ padding: "5px" }}>
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
        fill: new Fill({ color: color }),
        displacement: [0, 16],
      }),
    }),
    new Style({
      image: new RegularShape({
        points: 3,
        radius: 10,
        displacement: [0, -10],
        rotation: Math.PI,
        fill: new Fill({ color: color }),
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
