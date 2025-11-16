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
import { LineString } from "ol/geom.js";

export default function MapClient() {
  const mapRef = useRef(null);
  const clickVector = new VectorSource();
  const eventVector = new VectorSource();
  
  let userCoord = null;

  useEffect(() => {
    if (mapRef.current) return;

    const clickLayer = new VectorLayer({
      source: clickVector,
      style: pinStyle('red')
    });

    const eventLayer = new VectorLayer({
      source: eventVector,
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

      // If no event was selected, clear selected_event
      if(!event_select) selected_event = null;

      clickVector.clear();
      const feature = new ol.Feature({ geometry: new Point(coord) });
      if (!event_select) clickVector.addFeature(feature);
      event_select = false;

      // Clear old event markers
      eventVector.clear();
      // Load stored events
      const saved = JSON.parse(localStorage.getItem("events") || "[]");
      saved.forEach((ev) => {
        const f = new ol.Feature({ geometry: new Point(fromLonLat([ev.lon, ev.lat])) });
        f.set("eventData", ev);

        if(selected_event && ev.id === selected_event.id) f.setStyle(pinStyle('blue'));
        else f.setStyle(new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: "blue" }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          })}));

        eventVector.addFeature(f);
      });

      

      // Add dashed line
      // if (userCoord) {
      //   const line = new LineString([(selected_event)?fromLonLat([selected_event.lon, selected_event.lat]):fromLonLat([lon, lat]), fromLonLat(userCoord)]);
      //   const lineFeature = new Feature({
      //     geometry: line,
      //   });
      //   const lineStyle = new Style({
      //     stroke: new Stroke({
      //       color: 'blue',
      //       width: 2,
      //       lineDash: [5, 5], // Dotted pattern: [dash length, gap length]
      //     }),
      //   });

      //   const lineVector = new VectorSource({ 
      //     features: [lineFeature],
      //   });

      //   const lineLayer = new VectorLayer({
      //     source: lineVector,
      //   });

      //   lineFeature.setStyle(lineStyle);
      //   lineVector.addFeature(lineFeature);
      // }
    });

    window.addEventListener("eventSelected", (e) => {
      const eventData = e.detail;
      const coordinate = fromLonLat([eventData.lon, eventData.lat]);
      
      map.getView().getCenter(coordinate);

      clickVector.clear();
      const feature = new od.Feature({ geometry: new Point(coord)});
      clickVector.addFeature(feature);

      eventVector.clear();
      const saved = JSON.parse(localStorage.getItem("Event") || "[]");
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const data = feature.get("eventData");
        if (data) {
          event_select = true;
          window.dispatchEvent(new CustomEvent("eventSelected", { detail: data }));
          selected_event = data;
        }
      });
      saved.forEach((ev) => {
        const f = new ol.Feature({ geometry: new Point(fromLonLat([ev.lon, ev.lat])) });
        f.set("eventData", ev);

        if (selected_event && ev.id === eventData.id) {
          f.setStyle(pinStyle('blue'));
        } else {
          f.setStyle(new Style({
            image: new CircleStyle({
              radius: 7,
              fill: new Fill({ color: "red" }),
              stroke: new Stroke({ color: "#ffffff", width: 2 }),
            })
          }));
        }
        eventVector.addFeature(f);
      })
    });

    // Initial load of events
    const saved = JSON.parse(localStorage.getItem("events") || "[]");
    saved.forEach((ev) => {
      const f = new ol.Feature({ geometry: new Point(fromLonLat([ev.lon, ev.lat])) });
      f.set("eventData", ev);

      f.setStyle(new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color: "blue" }),
          stroke: new Stroke({ color: "#ffffff", width: 2 }),
        })}));

      eventVector.addFeature(f);
    });


    const loadEvents = async () => {
      try {
        const events = await getEvent();

        events.forEach((ev) => {
          const feature = new ol.Feature({
            geometry: new Point(fromLonLat([ev.lon, ev.lat])),
          });

          feature.setId(ev.id);
          feature.set("eventData", ev);

          eventVector.addFeature(feature);
        });

        console.log("Loaded events:", events.length);
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    };

    loadEvents();

    window.addEventListener("eventDeleted", (e) => {
      const deletedId = e.detail;
      const feature = eventVector.getFeatureById(deletedId);

      if (feature) {
        eventVector.removeFeature(feature);
        console.log("Removed marker for", deletedId);
      }
    });

    // --- USER LOCATION LAYER ---
    const userLocationSource = new VectorSource();

    const userLocationLayer = new VectorLayer({
      source: userLocationSource,
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: "red" }),
          stroke: new Stroke({ color: "white", width: 2 })
        })
      })
    });

    // Add user layer to map
    map.addLayer(userLocationLayer);

    // Attempt to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLon = pos.coords.longitude;
          const userLat = pos.coords.latitude;
          userCoord = [userLon, userLat];

          const userPoint = new ol.Feature({
            geometry: new Point(fromLonLat([userLon, userLat])),
          });

          // Add the red circle marker
          userLocationSource.clear();
          userLocationSource.addFeature(userPoint);

          // Center map on user
          map.getView().setCenter(fromLonLat([userLon, userLat]));
          map.getView().setZoom(17);
        },
        () => {
          console.warn("User denied geolocation — using default location.");
        }
      );
    }

    const centerOnEvent = (e) => {
      const ev = e.detail;
      if (!ev) return;

      const coord = fromLonLat([ev.lon, ev.lat]);

      map.getView().animate({
        center: coord,
        duration: 350,
        zoom: 18,
      });
    };
    window.addEventListener("eventSelected", centerOnEvent);
    
    mapRef.current = map;

    return () => {
      window.removeEventListener("eventSelected", centerOnEvent);
    };
  }, []);

  return <div id="map" style={{ width: "100%", height: "100vh" }} />;
}

function pinStyle(color) {
  return [new Style({
        image: new Circle({
          radius: 8.5,
          fill: new Fill({ color: color }),
          displacement: [0, 16],
        })
      }),
      new Style({
        image: new RegularShape({
          points: 3,
          radius: 10,
          displacement: [0, -10],
          rotation: Math.PI,
          fill: new Fill({ color: color }),
        })
      }),
      new Style({
        image: new Circle({
          radius: 4,
          fill: new Fill({ color: 'white' }),
          displacement: [0, 16],
        })
      })];
}