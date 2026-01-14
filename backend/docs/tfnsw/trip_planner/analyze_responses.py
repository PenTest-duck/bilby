#!/usr/bin/env python3
"""
Analyze TfNSW Trip Planner API example responses
Extracts key structures and important fields
"""

import json
import os
from collections import defaultdict

def analyze_json_structure(obj, prefix="", depth=0, max_depth=4):
    """Recursively analyze JSON structure"""
    if depth > max_depth:
        return {}
    
    structure = {}
    
    if isinstance(obj, dict):
        for key, value in obj.items():
            path = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                structure[path] = f"object ({len(value)} keys)"
                structure.update(analyze_json_structure(value, path, depth + 1, max_depth))
            elif isinstance(value, list):
                if len(value) > 0:
                    structure[path] = f"array ({len(value)} items)"
                    if isinstance(value[0], dict):
                        structure.update(analyze_json_structure(value[0], f"{path}[0]", depth + 1, max_depth))
                else:
                    structure[path] = "array (empty)"
            else:
                structure[path] = f"{type(value).__name__}: {repr(value)[:50]}"
    
    return structure

def summarize_stop_finder(data):
    """Summarize stop_finder response"""
    print("\n=== STOP FINDER RESPONSE ===")
    print(f"Version: {data.get('version')}")
    
    locations = data.get('locations', [])
    print(f"Locations count: {len(locations)}")
    
    if locations:
        loc = locations[0]
        print(f"\nFirst location structure:")
        print(f"  - id: {loc.get('id')}")
        print(f"  - name: {loc.get('name')}")
        print(f"  - disassembledName: {loc.get('disassembledName')}")
        print(f"  - type: {loc.get('type')}")
        print(f"  - coord: {loc.get('coord')}")
        print(f"  - modes: {loc.get('modes')}")
        print(f"  - matchQuality: {loc.get('matchQuality')}")
        print(f"  - isBest: {loc.get('isBest')}")
        print(f"  - parent: {loc.get('parent', {}).get('name') if loc.get('parent') else 'None'}")
        
        props = loc.get('properties', {})
        if props:
            print(f"  - properties keys: {list(props.keys())[:10]}")

def summarize_departure_mon(data):
    """Summarize departure_mon response"""
    print("\n=== DEPARTURE MONITOR RESPONSE ===")
    print(f"Version: {data.get('version')}")
    
    locations = data.get('locations', [])
    print(f"Locations count: {len(locations)}")
    
    stop_events = data.get('stopEvents', [])
    print(f"Stop events count: {len(stop_events)}")
    
    if stop_events:
        event = stop_events[0]
        print(f"\nFirst stop event structure:")
        print(f"  - departureTimePlanned: {event.get('departureTimePlanned')}")
        print(f"  - departureTimeEstimated: {event.get('departureTimeEstimated')}")
        print(f"  - isRealtimeControlled: {event.get('isRealtimeControlled')}")
        
        loc = event.get('location', {})
        print(f"  - location.name: {loc.get('name')}")
        print(f"  - location.type: {loc.get('type')}")
        print(f"  - location.properties: {list(loc.get('properties', {}).keys())[:5]}")
        
        trans = event.get('transportation', {})
        print(f"  - transportation.number: {trans.get('number')}")
        print(f"  - transportation.name: {trans.get('name')}")
        print(f"  - transportation.iconId: {trans.get('iconId')}")
        print(f"  - transportation.product.class: {trans.get('product', {}).get('class')}")
        print(f"  - transportation.destination.name: {trans.get('destination', {}).get('name')}")
        
        infos = event.get('infos', [])
        print(f"  - infos count: {len(infos)}")
        
        onwards = event.get('onwardLocations', [])
        if onwards:
            print(f"  - onwardLocations count: {len(onwards)}")
            ow = onwards[0]
            print(f"    - first onwards: {ow.get('name')}")
            print(f"    - properties: {list(ow.get('properties', {}).keys())}")

def summarize_trip(data):
    """Summarize trip response"""
    print("\n=== TRIP RESPONSE ===")
    print(f"Version: {data.get('version')}")
    
    journeys = data.get('journeys', [])
    print(f"Journeys count: {len(journeys)}")
    
    if journeys:
        journey = journeys[0]
        print(f"\nFirst journey structure:")
        print(f"  - interchanges: {journey.get('interchanges')}")
        print(f"  - isAdditional: {journey.get('isAdditional')}")
        
        legs = journey.get('legs', [])
        print(f"  - legs count: {len(legs)}")
        
        fare = journey.get('fare', {})
        tickets = fare.get('tickets', [])
        print(f"  - fare.tickets count: {len(tickets)}")
        if tickets:
            t = tickets[0]
            print(f"    - first ticket: {t.get('name')} - person: {t.get('person')}")
            print(f"    - priceBrutto: {t.get('priceBrutto')}")
            print(f"    - properties keys: {list(t.get('properties', {}).keys())[:8]}")
        
        if legs:
            leg = legs[0]
            print(f"\n  First leg structure:")
            print(f"    - duration: {leg.get('duration')} seconds")
            print(f"    - distance: {leg.get('distance')} meters")
            print(f"    - isRealtimeControlled: {leg.get('isRealtimeControlled')}")
            
            origin = leg.get('origin', {})
            print(f"    - origin.name: {origin.get('name')}")
            print(f"    - origin.departureTimePlanned: {origin.get('departureTimePlanned')}")
            print(f"    - origin.departureTimeEstimated: {origin.get('departureTimeEstimated')}")
            print(f"    - origin.properties keys: {list(origin.get('properties', {}).keys())}")
            
            dest = leg.get('destination', {})
            print(f"    - destination.name: {dest.get('name')}")
            
            trans = leg.get('transportation', {})
            print(f"    - transportation.number: {trans.get('number')}")
            print(f"    - transportation.product.class: {trans.get('product', {}).get('class')}")
            
            stop_seq = leg.get('stopSequence', [])
            print(f"    - stopSequence count: {len(stop_seq)}")
            
            coords = leg.get('coords', [])
            print(f"    - coords count: {len(coords)}")
            
            infos = leg.get('infos', [])
            print(f"    - infos (alerts) count: {len(infos)}")
            if infos:
                info = infos[0]
                print(f"      - first alert: {info.get('subtitle', info.get('title', 'N/A'))[:60]}")
            
            hints = leg.get('hints', [])
            print(f"    - hints count: {len(hints)}")
            
            props = leg.get('properties', {})
            print(f"    - properties keys: {list(props.keys())}")

def summarize_add_info(data):
    """Summarize add_info response"""
    print("\n=== ADD_INFO (SERVICE ALERTS) RESPONSE ===")
    print(f"Version: {data.get('version')}")
    print(f"Timestamp: {data.get('timestamp')}")
    
    infos = data.get('infos', {})
    current = infos.get('current', [])
    print(f"Current alerts count: {len(current)}")
    
    affected = infos.get('affected', {})
    print(f"Total affected stops: {len(affected.get('stops', []))}")
    print(f"Total affected lines: {len(affected.get('lines', []))}")
    
    if current:
        alert = current[0]
        print(f"\nFirst alert structure:")
        print(f"  - id: {alert.get('id')}")
        print(f"  - version: {alert.get('version')}")
        print(f"  - type: {alert.get('type')}")
        print(f"  - priority: {alert.get('priority')}")
        print(f"  - subtitle: {alert.get('subtitle', 'N/A')[:60]}")
        print(f"  - content length: {len(alert.get('content', ''))}")
        print(f"  - url: {alert.get('url', 'N/A')[:50]}")
        
        ts = alert.get('timestamps', {})
        print(f"  - timestamps.creation: {ts.get('creation')}")
        print(f"  - timestamps.lastModification: {ts.get('lastModification')}")
        print(f"  - timestamps.validity count: {len(ts.get('validity', []))}")
        
        affected = alert.get('affected', {})
        print(f"  - affected.lines count: {len(affected.get('lines', []))}")
        print(f"  - affected.stops count: {len(affected.get('stops', []))}")
        
        props = alert.get('properties', {})
        print(f"  - properties keys: {list(props.keys())}")

def summarize_coord(data):
    """Summarize coord response"""
    print("\n=== COORD (NEARBY) RESPONSE ===")
    print(f"Version: {data.get('version')}")
    
    locations = data.get('locations', [])
    print(f"Locations count: {len(locations)}")
    
    if locations:
        loc = locations[0]
        print(f"\nFirst location structure:")
        print(f"  - id: {loc.get('id')}")
        print(f"  - name: {loc.get('name')}")
        print(f"  - type: {loc.get('type')}")
        print(f"  - coord: {loc.get('coord')}")
        
        props = loc.get('properties', {})
        print(f"  - properties.distance: {props.get('distance')}")
        print(f"  - properties keys: {list(props.keys())[:10]}")

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    files = {
        'stop_finder': 'example_stop_finder_1_epp.json',
        'departure_mon_1': 'example_departure_mon_1_central.json',
        'departure_mon_2': 'example_departure_mon_2_circular_quay.json',
        'trip_1': 'example_trip_1.json',
        'trip_2': 'example_trip_2.json',
        'add_info_1': 'example_add_info_1_all_modes.json',
        'add_info_2': 'example_add_info_2_only_trains.json',
        'coord_gis': 'example_coord_1_gis_point.json',
        'coord_bus': 'example_coord_2_bus_point.json',
        'coord_poi': 'example_coord_3_poi_point.json',
    }
    
    for name, filename in files.items():
        filepath = os.path.join(base_dir, filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filename}")
            continue
        
        print(f"\n{'='*60}")
        print(f"ANALYZING: {filename}")
        print(f"{'='*60}")
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        print(f"File size: {os.path.getsize(filepath) / 1024:.1f} KB")
        
        if 'stop_finder' in name:
            summarize_stop_finder(data)
        elif 'departure_mon' in name:
            summarize_departure_mon(data)
        elif 'trip' in name:
            summarize_trip(data)
        elif 'add_info' in name:
            summarize_add_info(data)
        elif 'coord' in name:
            summarize_coord(data)

if __name__ == '__main__':
    main()
