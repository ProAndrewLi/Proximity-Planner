import { firestore } from "./firebase";
import { collection, addDoc, getDocs, deleteDoc, doc} from "firebase/firestore";

export async function saveEvent(e) {
  // Local Storage
  const list = JSON.parse(localStorage.getItem("events") || "[]");
  list.push(e);
  localStorage.setItem("events", JSON.stringify(list));

  // FireStore
  try {
    const ref = collection(firestore, "events");
    const docRef = await addDoc(ref, {
      name: e.name,
      org: e.org,
      time: e.time,
      lat: e.lat,
      lon: e.lon,
    });
    console.log("Saved to Firestore Ideally");
  } catch (error) {
    console.log("Error");
    throw error;
  }
}

export async function getEvent() {
  try {
    console.log("Fetching events from Firebase...");
    const querySnapshot = await getDocs(collection(firestore, "events"));
    const events = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });
    
    // Overwrite localStorage with fresh data from Firestore
    localStorage.setItem("events", JSON.stringify(events));
    console.log("Loaded events from Firebase and saved to localStorage");
    return events;
  } catch (error) {
    console.error("Error getting events from Firebase: ", error);
    throw error;
  }
}

export async function deleteEvent(id) {
  const ref = doc(firestore, "events", id);
  await deleteDoc(ref);

  const events = JSON.parse(localStorage.getItem("events") || "[]");
  const updatedEvents = events.filter(event => event.id !== id);
  localStorage.setItem("events", JSON.stringify(updatedEvents));
  console.log("Deleted from localStorage");
}