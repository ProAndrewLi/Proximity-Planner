// Create a map instance
const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        }),
        // Add a vector layer for markers
        new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 6,
                    fill: new ol.style.Fill({ color: '#ff0000' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                })
            })
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([-73.67674185776823, 42.72998702798406]),
        zoom: 17
    })
});

// Get the vector layer for markers (second layer)
const markerLayer = map.getLayers().item(1);
const markerSource = markerLayer.getSource();

// Tear drop style
// const tearDropStyle = new Style({
//     image: new Icon({
//         src: 'images/pin.jpg',
//         anchor: [0.5, 1], // Anchor the point at the bottom center
//         scale: 1
//     })
// });

// Handle map click to get geographic coordinates
map.on('click', function(event) {
    // Get the coordinate in Web Mercator projection (EPSG:3857)
    const coordinate = event.coordinate;
    
    // Convert to longitude/latitude (EPSG:4326)
    const [lon, lat] = ol.proj.toLonLat(coordinate);
    
    // Update the UI display
    const coordText = document.getElementById('coordText');
    coordText.textContent = `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
    
    // Log to console
    console.log(`Clicked at: Latitude: ${lat.toFixed(6)}, Longitude: ${lon.toFixed(6)}`);
    
    // Store the coordinates
    window.lastClickCoords = { lat, lon, coordinate };

    markerSource.clear(); // Clear previous markers
    
    // Create and add a marker at the clicked location
    const marker = new ol.Feature({
        geometry: new ol.geom.Point(coordinate)
    });

    // marker.setStyle(tearDropStyle);
    markerSource.addFeature(marker);
    
    // Dispatch a custom event so other parts of your app can listen
    const event_ = new CustomEvent('mapClicked', { 
        detail: { lat, lon, coordinate } 
    });
    document.dispatchEvent(event_);
});