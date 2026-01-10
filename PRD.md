Product Name
------------

**Bilby**

Tagline
-------

**Faster decisions. Fewer taps. Smarter routing. Less waiting.**

1\. Overview
------------

**Bilby** is a next-generation public transport trip planner for **New South Wales (NSW), Australia**, designed as a modern, opinionated replacement for TripView.

Where existing apps focus on displaying large amounts of transport data, Bilby focuses on **collapsing uncertainty into a clear, confident action**.

> Bilby’s job is not to show everything — it is to answer:**“What should I catch right now?”**

2\. Problem Statement
---------------------

Catching public transport often happens in **short, stressful bursts**:

*   You are on the move
    
*   You are time-constrained
    
*   You need an answer _now_, not after several taps
    

Existing solutions (e.g. TripView):

*   Require multiple interactions to reach the answer
    
*   Optimise for completeness over clarity
    
*   Do not sufficiently reduce cognitive load during disruptions
    
*   Feel data-heavy rather than decision-oriented
    

This leads to:

*   Slower decision-making
    
*   Missed connections
    
*   Lower user trust during disruptions
    

3\. Goals
---------

### Primary Goal

Reduce **time-to-decision** when planning or tracking a public transport journey.

### Secondary Goals

*   Increase user confidence and trust in recommendations
    
*   Minimise interaction friction
    
*   Make public transport feel **seamless and delightful**, not stressful
    
*   Feel “smarter” than competitors despite using the same TfNSW data
    

4\. Non-Goals
-------------

*   Teaching users how NSW public transport works
    
*   Tourist-focused discovery or exploration
    
*   Route planning for users completely unfamiliar with the system (v1)
    
*   Social features, ads, or monetisation-driven UX compromises
    

5\. Target Users
----------------

### Primary Users (in order)

1.  **Daily commuters** (routine trips)
    
2.  **Semi-variable commuters** (students, hybrid workers)
    
3.  **Irregular travellers** (events, nights out)
    

### Explicitly Not Targeted (v1)

*   First-time users unfamiliar with NSW public transport
    

### Technical Proficiency

*   Average to power smartphone users
    
*   Comfortable with apps like TripView, Google Maps
    

6\. Core User Jobs (JTBD)
-------------------------

### Routine Commute

> “What do I need to catch right now?”

### Disruption / Delay

> “What changed, what should I do instead, and how late will I be?”

### Leaving an Event

> “What are my realistic options if I leave now vs later?”

### Transfer-Heavy Trips

> “Which transfer strategy gets me there fastest with minimal risk?”

7\. Product Principles (Non-Negotiable)
---------------------------------------

1.  **Decision > Data**
    
2.  **Opinionated by Default**
    
3.  **Fast First Answer**
    
4.  **Minimal UI, Maximum Clarity**
    
5.  **Trust Through Consistency**
    
6.  **Progressive Disclosure (Explain on Tap)**
    

8\. Key Experience Definition
-----------------------------

### First Screen Rule

When a user opens Bilby with a saved or inferred trip, the primary question answered is:

> **“What should I catch right now?”**

### Loading Behaviour

*   Skeleton UI is acceptable
    
*   Avoid showing incorrect or speculative “best guesses”
    
*   Data freshness should be visible (e.g. “Updated 6s ago”)
    

9\. Routing & Ranking Logic
---------------------------

### Default Optimisation

*   **Earliest arrival**
    
*   Reasonable walking distance
    
*   TfNSW Trip Planner API provides baseline routing
    

### Ranking Behaviour

*   Fastest route ranks first, even if historically unreliable
    
*   Reliability indicators shown subtly (icons / micro-stats)
    
*   Cancelled services never shown
    
*   Severely delayed routes naturally rank lower
    

### Comparison Dimensions (Top Priority)

1.  Arrival time
    
2.  Walking distance
    
3.  Cost (Opal)
    
4.  Transfers (secondary)
    

### Power User Options

*   Allow strategy toggles (e.g. “Best”, “Least Walking”, “Fewest Transfers”)
    

10\. Disruption UX
------------------

### Priority Order

1.  Quick heads-up on what happened (e.g. “Track incident”)
    
2.  Clear recommendation of what to do next
    
3.  Impact on arrival time
    
4.  Other alternatives (expandable)
    

### Tone

*   Calm
    
*   Clear
    
*   Action-oriented
    

11\. UI / UX Philosophy
-----------------------

### Core Attributes

*   **Frictionless**
    
*   **Snappy**
    
*   **Polished**
    

### Structure

*   Timeline / list-first mental model
    
*   Map view available via toggle
    
*   No unnecessary steps before reaching actionable info
    

### Visual Language

*   Clean, minimal, modern
    
*   Icons + concise stats over dense numbers
    
*   No clutter by default
    

12\. Maps
---------

*   Secondary to list/timeline
    
*   User-toggleable
    
*   Used primarily for:
    
    *   Visual confirmation
        
    *   Situational awareness
        
    *   Exploration during disruptions
        

13\. Personalisation & Learning
-------------------------------

### Allowed

*   Frequent trips
    
*   Preferred lines
    
*   Silent learning over time
    

### Constraints

*   No over-assumption
    
*   No intrusive behaviour
    
*   Learning must be explainable on tap (“Why am I seeing this?”)
    

14\. Widgets
------------

### v1 Widget

*   **Time until next departure**
    
*   Live updating
    
*   Lightweight and glanceable
    

### Priority

Widgets are valuable but **non-critical** to initial product success.

15\. Trust & Explainability
---------------------------

*   Recommendations explainable **on tap**
    
*   Avoid verbose explanations
    
*   Accuracy preferred over aggressiveness
    
*   Confidence without arrogance
    

16\. Backend Architecture (High-Level)
--------------------------------------

*   Mobile clients **never** call TfNSW APIs directly
    
*   Backend:
    
    *   Polls TfNSW APIs (HEAD/GET)
        
    *   Maintains cached, formatted datasets
        
    *   Exposes fast, mobile-friendly endpoints
        
*   Supabase used for:
    
    *   Auth
        
    *   User preferences
        
    *   Saved trips
        

### Resilience

*   Graceful handling of outages
    
*   Partial data acceptable with transparency
    

17\. Data Freshness
-------------------

*   Balance real-time accuracy with battery/network efficiency
    
*   Show last update time where relevant
    
*   Cached “best known” data acceptable
    

18\. Platform & Tech
--------------------

*   Mobile app: **Expo (iOS + Android)**
    
*   Guest usage supported
    
*   Optional passwordless sign-in (email / Google)
    
*   Privacy-first (especially with location access)
    

19\. Monetisation
-----------------

*   **One-time paid** (preferred)
    
*   No ads
    
*   No selling user data
    
*   No dark patterns
    

20\. Version Scope
------------------

### v0 (Foundation)

*   Core TripView-equivalent features
    
*   Saved trips
    
*   Real-time departures
    
*   Routing & ranking
    

### v1

*   Home screen widget
    
*   “What should I catch right now?” UX
    
*   Transit map toggle
    
*   Disruption-first experience
    

### v2+

*   Offline support
    
*   Advanced analytics
    
*   Cross-region extensibility
    

21\. Success Metrics
--------------------

### Primary

*   **Time-to-decision**
    
*   User trust
    

### Qualitative

*   “I stopped opening TripView”
    
*   “I don’t think anymore — I just follow it”
    

### Quantitative

*   Reduced taps to first actionable answer
    
*   High retention among commuters
    

22\. Future Considerations
--------------------------

*   Multi-region support (e.g. VIC)
    
*   More sophisticated reliability scoring
    
*   Crowd-level signals (if available)
    

**Bilby is built to respect attention.**Everything else is secondary.