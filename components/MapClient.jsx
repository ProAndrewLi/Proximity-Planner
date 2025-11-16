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

export default function MapClient() {
  const mapRef = useRef(null);
  const clickVector = new VectorSource();
  const eventVector = new VectorSource();

  useEffect(() => {
    if (mapRef.current) return;

    const clickLayer = new VectorLayer({
      source: clickVector,
      style: [new Style({
        image: new Circle({
          radius: 8.5,
          fill: new Fill({ color: 'red' }),
          displacement: [0, 16],
        })
      }),
      new Style({
        image: new RegularShape({
          points: 3,
          radius: 10,
          displacement: [0, -10],
          rotation: Math.PI,
          fill: new Fill({ color: 'red' }),
        })
      }),
      new Style({
        image: new Circle({
          radius: 4,
          fill: new Fill({ color: 'white' }),
          displacement: [0, 16],
        })
      }),]
    });

    const eventLayer = new VectorLayer({
      source: eventVector,
      style: new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color: "#0066ff" }),
          stroke: new Stroke({ color: "#ffffff", width: 2 }),
        }),
      }),
    });

    const map = new ol.Map({
      target: "map",
      layers: [new TileLayer({ source: new OSM() }), clickLayer, eventLayer],
      view: new View({ center: fromLonLat([-73.6767, 42.72998]), zoom: 17 }),
    });

    let event_select = false; // Keeps track if an event was selected
    let selected_event = null;

    map.on("click", (evt) => {
      const coord = evt.coordinate;
      const [lon, lat] = toLonLat(coord);

      // clear details on sidebar
      window.dispatchEvent(new CustomEvent("clearDetails"));

      localStorage.setItem("lastClick", JSON.stringify({ lon, lat }));

      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const data = feature.get("eventData");
        if (data) {
          event_select = true;
          window.dispatchEvent(new CustomEvent("eventSelected", { detail: data }));
          selected_event = data;
        }
      });

      clickVector.clear();
      const feature = new ol.Feature({ geometry: new Point(coord) });
      if (!event_select) clickVector.addFeature(feature);
      event_select = false;
    });

    // Load stored events
    const saved = JSON.parse(localStorage.getItem("events") || "[]");
    saved.forEach((ev) => {
      const f = new ol.Feature({ geometry: new Point(fromLonLat([ev.lon, ev.lat])) });
      f.set("eventData", ev);
      eventVector.addFeature(f);
    });

    // In your MapClient component, replace the loadEvents function with:
    const loadEvents = async () => {
      try {
        console.log("Loading events...");
        const events = await getEvents(); // Use the updated function

        events.forEach((ev) => {
          const f = new ol.Feature({
            geometry: new Point(fromLonLat([ev.lon, ev.lat]))
          });
          f.set("eventData", ev);
          eventVector.addFeature(f);
        });

        console.log("Loaded events:", events.length);
      } catch (error) {
        console.error("Failed to load events:", error);
      }
    };

    mapRef.current = map;
  }, []);

  return <div id="map" style={{ width: "100%", height: "100vh" }} />;
}