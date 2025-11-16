import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import 'ol/ol.css';
import styles from '../styles/globals.module.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import OSM from 'ol/source/OSM.js';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js';
import { Point } from 'ol/geom';
import Feature from 'ol/Feature';
import { fromLonLat, toLonLat } from 'ol/proj';

export default function Home() {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markerSource = useRef(null);

  const [lastCoords, setLastCoords] = useState(null);
  const [panelState, setPanelState] = useState('idle'); // idle → form → submitted
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    time: ''
  });

  useEffect(() => {
    if (!mapRef.current) return;

    markerSource.current = new VectorSource();

    const vectorLayer = new VectorLayer({
      source: markerSource.current,
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: '#ff0000' }),
          stroke: new Stroke({ color: '#fff', width: 2 })
        })
      })
    });

    mapObj.current = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([-73.67674, 42.72998]),
        zoom: 17
      })
    });

    mapObj.current.on('click', (evt) => {
      const [lon, lat] = toLonLat(evt.coordinate);
      setLastCoords({ lat, lon, coordinate: evt.coordinate });

      markerSource.current.clear();
      markerSource.current.addFeature(
        new Feature({ geometry: new Point(evt.coordinate) })
      );
    });
  }, []);

  const handleCreate = () => {
    if (!lastCoords) return alert('Click the map first!');
    setPanelState('form');
  };

  const handleSubmit = () => {
    console.log('Event created:', {
      ...formData,
      location: lastCoords
    });

    setFormData({ name: '', organization: '', time: '' });
    setPanelState('idle');
  };

  return (
    <>
      <Head>
        <title>Proximity Planner</title>
      </Head>

      <div className={styles.container}>
        {/* Left 2/3 Map */}
        <div className={styles.mapWrapper}>
          <div ref={mapRef} className={styles.map}></div>
        </div>

        {/* Right 1/3 Panel */}
        <div className={styles.sidePanel}>
          {panelState === 'idle' && (
            <button className={styles.createBtn} onClick={handleCreate}>
              Create Event
            </button>
          )}

          {panelState === 'form' && (
            <div className={styles.formBox}>
              <h3>Create New Event</h3>

              <input
                type="text"
                placeholder="Event Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <input
                type="text"
                placeholder="Organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              />

              <input
                type="text"
                placeholder="Time Slot"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />

              <button className={styles.confirmBtn} onClick={handleSubmit}>
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
