import { firestore } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export async function saveEvent(e) {
  // Temp
  const list = JSON.parse(localStorage.getItem("events") || "[]");
  list.push(e);
  localStorage.setItem("events", JSON.stringify(list));

  // Firestore 
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
