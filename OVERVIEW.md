# Bilby

Bilby is a public transport trip planner for New South Wales (NSW), Australia.
It is an all-new and much better improved replacement to the existing TripView app.

## About the existing TripView app

TripView is a mobile app used in NSW for real-time public transport tracking and trip planning. It aggregates data from Transport for NSW (GTFS + real-time feeds) to show:
  - Timetables & live departures for trains, buses, ferries, and light rail
  - Service disruptions (delays, cancellations, platform changes)
  - Vehicle positions and predicted arrival times
  - Saved trips & stops for quick access
  - Trip planning across multiple transport modes

It is primarily a read-only, commuter utility focused on reliability and speed, not discovery or personalization. UX is functional and dense, optimized for frequent daily checks by Sydney commuters.

## The vision for Bilby

Bilby is a mobile app (both Android and iOS) built with Expo which allows people in NSW to really easily plan/track their trip. It is targeted towards NSW residents experienced with the transport network already and probably already use TripView (paid or Lite), and want even more useful features in their daily lives.

For example, a daily commuter who takes a bus from their house to their high school, or an office worker who travels from their nearest train station to a station in the city, or a university student who takes the train then switches to light rail, or a person who is wondering when they should leave a party and pondering options on when to leave / when they will arrive and weighing up the options.

Here's a specific case for one potential user: I live in Sydney and commute to university a few times a week. I get driven from my house and dropped off at Epping train station, then can either take a normal train (T9), an express regional train (CCN) or the metro (M1) to Central station. Then I transfer to a light rail either L2 to UNSW High Street or L3 to UNSW Anzac Parade, depending on where my class is on campus. Ocassionally there are slight train delays or trivial timetable misalignments, and on rare ocassions, there are service cancellations due to union strike or construction or inclement weather or incident etc.

Bilby should offer an outstanding user experience that minimises friction and make the experience of using public transport in NSW/Sydney as easy, quick, seamless, effortless, delightful as possible.

## Features

- All features that TripView currently offers:
  * Create, save, manage trips between two points
  * Shows a chronological list of all the possible ways the destination can be reached along with information like departure/arrival times, platform/bus stop etc., and shows the times to reach each intermediary station/stop
  * Displays service alerts, trip updates, notifications, cancellations etc., and is able to account for these when routing to the destination
  * A transit network map that shows real time locations/directions of vehicles, or for buses, a street map with overlay for the routes and vehicle locations/directions
  * Ability to toggle to see accessibility information
  * Ability to download timetables to offline phone storage so that basic features can be used without Internet access
- A widget that you can have in the home screen (Android/iOS) that shows time until certain favorite destinations (might need access to location data)
- See when you have to leave the house / what train to catch
- Allow usage of all core features without signing in (i.e. as guest), then ask for signup with passwordless email or Google OAuth if they want to use features like saving trips
- I would love for the backend to do some data analysis or build up metrics over time as to the delay percentages, average commuter time, average difference between scheduled time and actual time etc. and show it as neat little actually helpful stats. but probably as auxiliary information - i really don't want to clutter the UI. the UI should be sharp and straight-to-the-point and no-BS and simple.

It's crucially important that you offer a simple/minimalistic/no-BS/straight-to-the-point yet modern, polished, beautiful, elegant, effortless, user-centric, delightful UI and UX.

## About the TfNSW data sources

Transport for NSW (TfNSW) provides useful data sources / APIs for us. The documentation is in backend/docs/tfnsw.

The main modes of transport in NSW are train, bus, metro, ferry, light rail + others like regional train, regional bus/coach.

There are following APIs:
  - Get Realtime Alerts (v2)
  - Get Realtime Timetables (v1/v2)
  - Get Realtime Trip Updates (v1/v2)
  - Get Realtime Vehicle Positions (v1/v2)
  - Trip Planner

If there are multiple versions for an API, use the latest version endpoint, if it exists (e.g. Get Realtime Timetables API has v1 and v2, with /metro in v2 and all else in v1).

Notice that most of these endpoints have the ability to run a HEAD operation to check for new changes and the GET to actually fetch the data.

## About the backend server

The mobile app should not make direct requests to the TfNSW APIs, instead it must go through the backend. The backend server should periodically poll the relevant APIs (HEAD/GET) and keep an updated cache of formatted information that can be rapidly and easily served to the mobile clients.

The backend server should also have endpoints for its own operations like authentication, managing user preferences, saving trips etc. It is connected to a Supabase database.

The mobile client should have interfaces and mechanisms that accounts for backend errors, API errors, outages etc.

## Further Important Notes

While our initial app will specifically target the NSW/Sydney transport system, data structures, code architectures and design/engineering decisions should be extensible and account for the future possibility of new transport systems (e.g. Victoria/Melbourne) being added.

Ideally there's a feeling that the app learns and gets better over time.

Make sure not to clutter the UI - sharp, polished, modern, easy to use.