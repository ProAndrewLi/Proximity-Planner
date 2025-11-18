import MapClient from "./components/MapClient";
import Sidebar from "./components/Sidebar";
import "./index.css";

function App() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1 }}>
        <MapClient />
      </div>
      <div style={{ width: "350px" }}>
        <Sidebar />
      </div>
    </div>
  );
}

export default App;
