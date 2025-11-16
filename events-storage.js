// events-storage.js
// simple module to seed and persist events. Uses localStorage.

const STORAGE_KEY = 'proximity-planner.events.v1';

function sampleEvents(){
  const now = new Date();
  const in10Min = new Date(now.getTime() + 10*60*1000);
  const in2H = new Date(now.getTime() + 2*60*60*1000);
  const in2D = new Date(now.getTime() + 48*60*60*1000);

  return [
    {
      id: 1,
      title: 'Morning Yoga',
      org: 'City Yoga',
      start: new Date(now.getTime() - 30*60*1000).toISOString(),
      end: in10Min.toISOString(),
      lat: 37.7749,
      lon: -122.4194,
      following: false,
      description: 'Bring a mat and water. All levels welcome.',
      host: 'City Yoga Team'
    },
    {
      id: 2,
      title: 'Hack Night',
      org: 'Open Source Org',
      start: in2H.toISOString(),
      end: new Date(in2H.getTime()+2*60*60*1000).toISOString(),
      lat: 37.776,
      lon: -122.423,
      following: true,
      description: 'Project demos, lightning talks, and pairing sessions.',
      host: 'Open Source Org'
    },
    {
      id: 3,
      title: 'Community Meetup',
      org: 'Neighborhood Assoc',
      start: in2D.toISOString(),
      end: new Date(in2D.getTime()+3*60*60*1000).toISOString(),
      lat: 37.772,
      lon: -122.414,
      following: false,
      description: 'Meet neighbors and discuss local initiatives.',
      host: 'Neighborhood Association'
    }
  ];
}

function normalizeEvent(e){
  // Ensure shape and sane defaults; convert date-like fields to ISO strings where possible
  const copy = {
    id: e.id ?? Date.now(),
    title: e.title ?? '',
    org: e.org ?? '',
    start: e.start ? (new Date(e.start)).toISOString() : null,
    end: e.end ? (new Date(e.end)).toISOString() : null,
    lat: (typeof e.lat === 'number') ? e.lat : null,
    lon: (typeof e.lon === 'number') ? e.lon : null,
    following: !!e.following,
    description: e.description ?? '',
    host: e.host ?? ''
  };
  return copy;
}

export function loadEvents(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    const seed = sampleEvents().map(normalizeEvent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try{
    const parsed = JSON.parse(raw);
    // ensure events include description/host and dates are ISO strings
    return parsed.map(e => normalizeEvent(e));
  }catch(e){
    console.error('failed parse events, resetting', e);
    const seed = sampleEvents().map(normalizeEvent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveEvents(events){
  // assume events already normalized, but normalize again defensively
  const safe = events.map(normalizeEvent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
}

export function addEvent(event){
  const events = loadEvents();
  const ev = normalizeEvent(event);
  // ensure a unique id (use timestamp + random suffix to reduce collisions)
  ev.id = Date.now() + Math.floor(Math.random()*1000);
  events.push(ev);
  saveEvents(events);
  return ev;
}

export function updateEvent(updated){
  const events = loadEvents();
  const updatedNorm = normalizeEvent(updated);
  const idx = events.findIndex(e => e.id === updatedNorm.id);
  if(idx >= 0){
    events[idx] = updatedNorm;
    saveEvents(events);
  }
  return updatedNorm;
}

export function deleteEvent(eventId){
  let events = loadEvents();
  events = events.filter(e => e.id !== eventId);
  saveEvents(events);
}
