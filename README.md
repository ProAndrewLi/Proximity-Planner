# Proximity Planner

Run using `npm install` then `npm run dev`.

May need to run `npm install firebase`


# TODO

- Admin privileges
- Sign in
- Only allow authorized event organizers to add and delete
- Organization/association filtering and grouping
- Show how many people signed up for an event and event seats
- Delete events that have passed
- Change the time to be from (time)-(time)
- Put events that are about to happen in priority on the sidebar
- Add descriptions and optional images for events
- When an event is deleted, reload the page automatically
- Overhaul the entire UI
- Filter content (spam, profanity)

## Bugs

- If filter is enabled and click anywhere on the map, the filtered out events will reappear on the map.
- If events are off screen and then click and drag to it, it won't show up until release.

# Ideas

- Friends list, confirming attendance to events (different window with events calendar)
- Path planning that determines time of travel between events (if enabled)
- If an event is travelling, a path can be added with time targets for each location (can be integrated with idea below)
- If an event is running at multiple locations, allow different points to be linked to each other for easy access