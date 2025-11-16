import { loadEvents, addEvent, updateEvent } from './events-storage.js';

let events = loadEvents();
let userPosition = null; // {lat, lon}

// helpers: distance, status
function toDate(s){ return s? new Date(s): null }
function now(){ return new Date(); }
function daysBetween(a,b){ return (b-a)/(24*3600*1000) }

function haversine(lat1, lon1, lat2, lon2){
  function toRad(x){return x*Math.PI/180}
  const R = 6371e3; // m
  const φ1 = toRad(lat1); const φ2 = toRad(lat2);
  const Δφ = toRad(lat2-lat1); const Δλ = toRad(lon2-lon1);
  const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2);
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c; // meters
}

function eventStatus(ev){
  const s = toDate(ev.start); const e = toDate(ev.end); const n = now();
  if(n >= s && n <= e) return 'now';
  const ms24 = 24*60*60*1000;
  if(s > n && s - n <= ms24) return 'soon';
  if(s > n) return 'later';
  return 'past';
}

// --- UI wires
const eventsList = document.getElementById('eventsList');
const eventDetails = document.getElementById('eventDetails');
const filterNow = document.getElementById('filterNow');
const filterSoon = document.getElementById('filterSoon');
const filterLater = document.getElementById('filterLater');
const filterFollowing = document.getElementById('filterFollowing');
const createBtn = document.getElementById('createBtn');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const eventForm = document.getElementById('eventForm');
const locateBtn = document.getElementById('locateBtn');

// map setup using OpenLayers
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer.js';
import {OSM} from 'ol/source.js';
import {Vector as VectorSource} from 'ol/source.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import {fromLonLat, toLonLat} from 'ol/proj.js';
import Style from 'ol/style/Style.js';
import Icon from 'ol/style/Icon.js';
import CircleStyle from 'ol/style/Circle.js';
import Text from 'ol/style/Text.js';

const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({ source: vectorSource });

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({ source: new OSM() }),
    vectorLayer
  ],
  view: new View({ center: fromLonLat([-122.4194, 37.7749]), zoom: 13 })
});

function makeFeature(ev){
  const feat = new Feature({ geometry: new Point(fromLonLat([ev.lon, ev.lat])), ev });
  const s = eventStatus(ev);
  let color = '#2b8cff';
  if(s==='now') color = '#19a34a';
  else if(s==='soon') color = '#ff9f1a';
  else if(ev.following) color = '#9b59b6';
  feat.setStyle(new Style({ image: new CircleStyle({ radius:10, fill: null, stroke: null }), text: new Text({ text: ev.title, offsetY:-18, font:'12px sans-serif', fill: null }) }));
  // use a simple icon with colored circle using canvas-generated data URL
  const canvas = document.createElement('canvas'); canvas.width=40; canvas.height=40;
  const ctx = canvas.getContext('2d');
  ctx.beginPath(); ctx.arc(20,20,12,0,Math.PI*2); ctx.fillStyle = color; ctx.fill();
  feat.setStyle(new Style({ image: new Icon({ src: canvas.toDataURL() }), text: new Text({ text: ev.title, offsetY:-26, font:'12px sans-serif' }) }));
  return feat;
}

function refreshMarkers(){
  vectorSource.clear();
  events.forEach(ev=>{
    if(eventStatus(ev) === 'past') return; // skip past
    vectorSource.addFeature(makeFeature(ev));
  });
}

// map click to open create modal with coords
map.on('click', function(e){
  const coords = toLonLat(e.coordinate);
  openModalWithCoords(coords[1], coords[0]);
});

// handle selecting event by clicking markers
map.on('singleclick', function(e){
  map.forEachFeatureAtPixel(e.pixel, function(feature){
    const ev = feature.get('ev');
    if(ev){ showEventDetails(ev); }
  });
});

function showEventDetails(ev){
  const s = eventStatus(ev);
  const distance = userPosition? Math.round(haversine(userPosition.lat, userPosition.lon, ev.lat, ev.lon)) : null;
  eventDetails.innerHTML = `
    <h3>${ev.title} <span class="event-tag">${s}</span></h3>
    <div class="event-meta">${ev.org} — ${new Date(ev.start).toLocaleString()} to ${new Date(ev.end).toLocaleString()}</div>
    <div style="margin-top:.5rem">Location: ${ev.lat.toFixed(5)}, ${ev.lon.toFixed(5)}${distance?` — ${distance} m away`:''}</div>
    <div style="margin-top:.5rem"><button onclick='toggleFollow(${ev.id})'>${ev.following? 'Unfollow' : 'Follow'}</button></div>
  `;
}

window.toggleFollow = function(id){
  const idx = events.findIndex(e=>e.id===id);
  if(idx<0) return;
  events[idx].following = !events[idx].following;
  updateEvent(events[idx]);
  renderEventList(); refreshMarkers();
}

// list rendering
function renderEventList(){
  eventsList.innerHTML = '';
  const filters = {
    now: filterNow.checked,
    soon: filterSoon.checked,
    later: filterLater.checked,
    following: filterFollowing.checked
  };

  // sort by distance if userPosition available else by start time
  const sorted = events.slice().filter(e=>eventStatus(e)!=='past').sort((a,b)=>{
    if(userPosition){
      const da = haversine(userPosition.lat,userPosition.lon,a.lat,a.lon);
      const db = haversine(userPosition.lat,userPosition.lon,b.lat,b.lon);
      return da-db;
    }
    return new Date(a.start) - new Date(b.start);
  });

  sorted.forEach(ev=>{
    const s = eventStatus(ev);
    if(!filters[s] && !(s!=='now'&&s!=='soon'&&s!=='later'&&filters.following && ev.following)) return;
    if(filters.following===false && ev.following && !filters[ s ]){
      // allow showing following even if their category is unchecked only when following filter enabled
    }
    const item = document.createElement('div');
    item.className = 'event-item small';
    item.innerHTML = `<strong>${ev.title}</strong><div class='event-meta'>${ev.org} • ${new Date(ev.start).toLocaleString()}</div>`;
    item.onclick = ()=>{
      // center map on event
      map.getView().animate({center: fromLonLat([ev.lon, ev.lat]), duration: 400});
      showEventDetails(ev);
    };
    eventsList.appendChild(item);
  });
}

// modal logic
function openModalWithCoords(lat, lon){
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  const latI = eventForm.querySelector('[name=lat]');
  const lonI = eventForm.querySelector('[name=lon]');
  latI.value = lat.toFixed(6); lonI.value = lon.toFixed(6);
}
function closeModalFn(){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }

createBtn.addEventListener('click', ()=>{
  // open modal but leave coords empty if no position
  openModalWithCoords(userPosition? userPosition.lat : 37.7749, userPosition? userPosition.lon : -122.4194);
});
closeModal.addEventListener('click', closeModalFn);

eventForm.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const data = new FormData(eventForm);
  const obj = {
    title: data.get('title'),
    org: data.get('org'),
    start: new Date(data.get('start')).toISOString(),
    end: new Date(data.get('end')).toISOString(),
    lat: parseFloat(data.get('lat')),
    lon: parseFloat(data.get('lon')),
    following: data.get('following') ? true : false
  };
  const saved = addEvent(obj);
  events.push(saved);
  renderEventList(); refreshMarkers(); closeModalFn();
});

locateBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    userPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    map.getView().animate({ center: fromLonLat([userPosition.lon, userPosition.lat]), zoom:14 });
    renderEventList();
  }, err=>{ alert('Failed to get position: '+err.message) });
});

// filters
[filterNow, filterSoon, filterLater, filterFollowing].forEach(el=> el.addEventListener('change', ()=> renderEventList()));

// periodic update for statuses
setInterval(()=>{ events = loadEvents(); renderEventList(); refreshMarkers(); }, 30*1000);

// initial render
renderEventList(); refreshMarkers();

// center map when user data available
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos=>{
    userPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
  }, ()=>{});
}