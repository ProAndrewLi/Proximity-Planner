
"use client";
import { useEffect, useRef } from "react";
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
import { fromLonLat, toLonLat } from "ol/proj";

export default function MapClient() {
  const mapRef = useRef(null);
  const vectorSource = new VectorSource();

  useEffect(() => {
    if (mapRef.current) return;

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: "#ff0000" }),
          stroke: new Stroke({ color: "#ffffff", width: 2 }),
        }),
      }),
    });

    const map = new ol.Map({
      target: "map",
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([-73.6767, 42.72998]),
        zoom: 17,
      }),
    });

    map.on("click", (evt) => {
      const coord = evt.coordinate;
      const [lon, lat] = toLonLat(coord);
      localStorage.setItem("lastClick", JSON.stringify({ lon, lat }));

      vectorSource.clear();
      const feature = new ol.Feature({ geometry: new Point(coord) });
      vectorSource.addFeature(feature);
    });

    mapRef.current = map;
  }, []);

  return <div id="map" style={{ width: "100%", height: "100vh" }} />;
}
