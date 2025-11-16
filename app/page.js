
import MapClient from "../components/MapClient";
import Sidebar from "../components/Sidebar";
import "../styles/globals.css";

export default function Page() {
  return (
    <div className="layout">
      <div className="map-section">
        <MapClient />
      </div>
      <div className="sidebar-section">
        <Sidebar />
      </div>
    </div>
  );
}
