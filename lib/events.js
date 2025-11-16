
export function saveEvent(e) {
  const list = JSON.parse(localStorage.getItem("events") || "[]");
  list.push(e);
  localStorage.setItem("events", JSON.stringify(list));
}
