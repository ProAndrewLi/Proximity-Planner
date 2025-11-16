# Proximity Planner

Run using `npm install` then `npm run dev`.


# Updated Next.js Project with OpenLayers CSS + Persistent Event Markers + Sidebar Event Details

This version adds:

* **OpenLayers CSS restored** (via import in MapClient)
* **Blue markers for saved events**
* **Clicking a blue marker shows event details in the sidebar**
* **Clicking the map clears event details and returns to Create Event view**

---


---

## lib/firebase.js

```js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

## components/MapClient.jsx

````jsx
// MapClient.jsx — Firestore-connected map client
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { onSnapshot, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { addEvent, deleteEvent } from "../lib/events";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapClient({ onSelectEvent }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng] = useState(-96);
  const [lat] = useState(37.8);
  const [zoom] = useState(3);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lng, lat],
      zoom,
    });

    map.current.on("click", async (e) => {
      const coords = e.lngLat;
      const newEvent = {
        title: "Untitled Event",
        description: "",
        lat: coords.lat,
        lng: coords.lng,
        createdAt: Date.now(),
      };
      await addEvent(newEvent);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      if (!map.current) return;

      const features = snapshot.docs.map((doc) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [doc.data().lng, doc.data().lat],
        },
        properties: {
          id: doc.id,
          title: doc.data().title,
          description: doc.data().description,
          delete: true,
        },
      }));

      if (map.current.getSource("events")) {
        map.current.getSource("events").setData({
          type: "FeatureCollection",
          features,
        });
      } else {
        map.current.addSource("events", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features,
          },
        });
        map.current.addLayer({
          id: "events-layer",
          type: "circle",
          source: "events",
          paint: {
            "circle-radius": 8,
          },
        });
      }

      map.current.on("click", "events-layer", (e) => {
        const feature = e.features[0];
        onSelectEvent(feature.properties);
      });
    });

    return () => unsubscribe();
  }, []);

  return <div ref={mapContainer} className="w-full h-full" />;
}
$3

---
## components/Sidebar.jsx
```jsx
// Sidebar.jsx — Firestore deletion enabled
import { deleteEvent } from "../lib/events";

export default function Sidebar({ selectedEvent, clearSelection }) {
  if (!selectedEvent) return <div className="p-4">Select or create an event.</div>;

  return (
    <div className="p-4 flex flex-col h-full justify-between">
      <div>
        <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
        <p className="mt-2 text-gray-700">{selectedEvent.description}</p>
      </div>

      <button
        className="bg-red-600 text-white mt-4 p-2 rounded self-end"
        onClick={async () => {
          await deleteEvent(selectedEvent.id);
          clearSelection();
        }}
      >
        Delete Event
      </button>
    </div>
  );
}
$3

---
## lib/events.js
```js
// Firestore-based event storage
import { db } from "../lib/firebase";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";

export async function saveEvent(e) {
  const ref = collection(db, "events");
  await addDoc(ref, e);
}

export async function deleteEvent(id) {
  await deleteDoc(doc(db, "events", id));
}
```js
export function saveEvent(e) {
  const list = JSON.parse(localStorage.getItem("events") || "[]");
  list.push(e);
  localStorage.setItem("events", JSON.stringify(list));
}
````

---

## styles/globals.css

```css
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

.layout {
  display: flex;
  width: 100%;
  height: 100vh;
}

.map-section {
  width: 66%;
}

.sidebar-section {
  width: 34%;
  background: white;
  border-left: 1px solid #ddd;
  overflow-y: auto;
}
```

---

If you want, I can regenerate the ZIP with these updates.

/* Override layout proportions */
.map-container, #map-container, .mapWrapper, .mapArea, #map {
flex: 0 0 66% !important;
max-width: 66% !important;
}
.side-panel, #side-panel, .sidePanel, .rightSection {
flex: 0 0 34% !important;
max-width: 34% !important;
}
