import Foundation
import ActivityKit

/// Trip phase representing the current state of the journey
enum TripPhase: String, Codable, Hashable {
    case walkingToStop = "walking_to_stop"
    case waiting = "waiting"
    case onVehicle = "on_vehicle"
    case transferring = "transferring"
    case arriving = "arriving"
    case completed = "completed"
    
    var displayName: String {
        switch self {
        case .walkingToStop: return "Walking"
        case .waiting: return "Waiting"
        case .onVehicle: return "On board"
        case .transferring: return "Transfer"
        case .arriving: return "Arriving"
        case .completed: return "Completed"
        }
    }
    
    var systemImage: String {
        switch self {
        case .walkingToStop: return "figure.walk"
        case .waiting: return "clock"
        case .onVehicle: return "tram.fill"
        case .transferring: return "arrow.triangle.swap"
        case .arriving: return "mappin.circle.fill"
        case .completed: return "checkmark.circle.fill"
        }
    }
}

/// Transport mode IDs matching TfNSW API
enum TransportMode: Int, Codable, Hashable {
    case train = 1
    case metro = 2
    case lightRail = 4
    case bus = 5
    case coach = 7
    case ferry = 9
    case schoolBus = 11
    
    var displayName: String {
        switch self {
        case .train: return "Train"
        case .metro: return "Metro"
        case .lightRail: return "Light Rail"
        case .bus: return "Bus"
        case .coach: return "Coach"
        case .ferry: return "Ferry"
        case .schoolBus: return "School Bus"
        }
    }
    
    var systemImage: String {
        switch self {
        case .train: return "tram.fill"
        case .metro: return "tram.fill"
        case .lightRail: return "tram"
        case .bus: return "bus.fill"
        case .coach: return "bus.doubledecker.fill"
        case .ferry: return "ferry.fill"
        case .schoolBus: return "bus.fill"
        }
    }
}

/// Static attributes for the Live Activity (set at start, don't change)
struct BilbyTripAttributes: ActivityAttributes {
    
    /// Dynamic content state that updates in real-time
    public struct ContentState: Codable, Hashable {
        // Current journey phase
        var phase: TripPhase
        
        // Timing
        var nextEventTime: Date
        var delayMinutes: Int
        var isDelayed: Bool
        var isCancelled: Bool
        
        // Location context
        var currentStopName: String
        var nextStopName: String
        var stopsRemaining: Int
        var platform: String?
        
        // Progress
        var currentLeg: Int
        var progress: Double  // 0.0 - 1.0
        
        // Alerts
        var hasAlert: Bool
        var alertMessage: String?
        
        // For transfers
        var nextLineNumber: String?
        var nextLineModeId: Int?
        var connectionTime: Int?
        
        // Navigation (for walking legs)
        var walkingDistanceMeters: Int?
        var walkingDirection: String?
        var walkingBearing: Double?
        var walkingEtaSeconds: Int?
        
        /// Formatted walking distance
        var walkingDistanceText: String? {
            guard let meters = walkingDistanceMeters else { return nil }
            if meters < 1000 {
                return "\(meters)m"
            }
            return String(format: "%.1fkm", Double(meters) / 1000.0)
        }
        
        /// Formatted walking ETA
        var walkingEtaText: String? {
            guard let seconds = walkingEtaSeconds else { return nil }
            let minutes = (seconds + 59) / 60 // Round up
            if minutes < 1 {
                return "< 1 min"
            }
            return "\(minutes) min walk"
        }
        
        /// Compass direction from bearing
        var compassDirection: String? {
            guard let bearing = walkingBearing else { return nil }
            let directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
            let index = Int((bearing + 22.5) / 45.0) % 8
            return directions[index]
        }
        
        /// Countdown text for the next event
        var countdownText: String {
            let now = Date()
            let interval = nextEventTime.timeIntervalSince(now)
            
            if interval <= 0 {
                return "Now"
            }
            
            let minutes = Int(interval / 60)
            if minutes < 1 {
                return "Now"
            } else if minutes < 60 {
                return "\(minutes)"
            } else {
                let hours = minutes / 60
                let remainingMinutes = minutes % 60
                return "\(hours)h \(remainingMinutes)m"
            }
        }
        
        /// Status text based on phase and delays
        var statusText: String {
            if isCancelled {
                return "Cancelled"
            }
            if isDelayed && delayMinutes > 0 {
                return "+\(delayMinutes) min delay"
            }
            return "On time"
        }
        
        /// Whether the service is running normally
        var isOnTime: Bool {
            return !isCancelled && !isDelayed
        }
    }
    
    // Journey identification
    var tripId: String
    var originId: String
    var originName: String
    var destinationId: String
    var destinationName: String
    
    // Primary transport info
    var lineNumber: String
    var lineName: String
    var modeId: Int
    var lineColor: String
    
    // Journey metadata
    var totalLegs: Int
    var plannedArrival: Date
    
    /// Get the transport mode enum
    var transportMode: TransportMode {
        return TransportMode(rawValue: modeId) ?? .train
    }
}

// MARK: - Preview Extensions

extension BilbyTripAttributes {
    static var preview: BilbyTripAttributes {
        BilbyTripAttributes(
            tripId: "preview-trip-1",
            originId: "2150220",
            originName: "Epping",
            destinationId: "2000100",
            destinationName: "Central",
            lineNumber: "T1",
            lineName: "North Shore Line",
            modeId: 1,
            lineColor: "#F99D1C",
            totalLegs: 1,
            plannedArrival: Date().addingTimeInterval(26 * 60)
        )
    }
    
    static var metroPreview: BilbyTripAttributes {
        BilbyTripAttributes(
            tripId: "preview-trip-2",
            originId: "2150220",
            originName: "Epping",
            destinationId: "2000100",
            destinationName: "Martin Place",
            lineNumber: "M1",
            lineName: "Metro North West",
            modeId: 2,
            lineColor: "#009B77",
            totalLegs: 1,
            plannedArrival: Date().addingTimeInterval(18 * 60)
        )
    }
}

extension BilbyTripAttributes.ContentState {
    static var waitingPreview: BilbyTripAttributes.ContentState {
        BilbyTripAttributes.ContentState(
            phase: .waiting,
            nextEventTime: Date().addingTimeInterval(12 * 60),
            delayMinutes: 0,
            isDelayed: false,
            isCancelled: false,
            currentStopName: "Epping",
            nextStopName: "Eastwood",
            stopsRemaining: 8,
            platform: "Platform 1",
            currentLeg: 1,
            progress: 0.0,
            hasAlert: false,
            alertMessage: nil,
            nextLineNumber: nil,
            nextLineModeId: nil,
            connectionTime: nil
        )
    }
    
    static var onBoardPreview: BilbyTripAttributes.ContentState {
        BilbyTripAttributes.ContentState(
            phase: .onVehicle,
            nextEventTime: Date().addingTimeInterval(8 * 60),
            delayMinutes: 2,
            isDelayed: true,
            isCancelled: false,
            currentStopName: "Chatswood",
            nextStopName: "North Sydney",
            stopsRemaining: 4,
            platform: nil,
            currentLeg: 1,
            progress: 0.5,
            hasAlert: false,
            alertMessage: nil,
            nextLineNumber: nil,
            nextLineModeId: nil,
            connectionTime: nil
        )
    }
    
    static var transferPreview: BilbyTripAttributes.ContentState {
        BilbyTripAttributes.ContentState(
            phase: .transferring,
            nextEventTime: Date().addingTimeInterval(5 * 60),
            delayMinutes: 0,
            isDelayed: false,
            isCancelled: false,
            currentStopName: "Central",
            nextStopName: "UNSW High Street",
            stopsRemaining: 6,
            platform: "Platform 1",
            currentLeg: 2,
            progress: 0.6,
            hasAlert: false,
            alertMessage: nil,
            nextLineNumber: "L2",
            nextLineModeId: 4,
            connectionTime: 5
        )
    }
    
    static var arrivingPreview: BilbyTripAttributes.ContentState {
        BilbyTripAttributes.ContentState(
            phase: .arriving,
            nextEventTime: Date().addingTimeInterval(2 * 60),
            delayMinutes: 0,
            isDelayed: false,
            isCancelled: false,
            currentStopName: "Wynyard",
            nextStopName: "Central",
            stopsRemaining: 1,
            platform: nil,
            currentLeg: 1,
            progress: 0.95,
            hasAlert: false,
            alertMessage: nil,
            nextLineNumber: nil,
            nextLineModeId: nil,
            connectionTime: nil
        )
    }
    
    static var delayedPreview: BilbyTripAttributes.ContentState {
        BilbyTripAttributes.ContentState(
            phase: .waiting,
            nextEventTime: Date().addingTimeInterval(15 * 60),
            delayMinutes: 8,
            isDelayed: true,
            isCancelled: false,
            currentStopName: "Epping",
            nextStopName: "Eastwood",
            stopsRemaining: 8,
            platform: "Platform 1",
            currentLeg: 1,
            progress: 0.0,
            hasAlert: true,
            alertMessage: "Minor delays on T1 line",
            nextLineNumber: nil,
            nextLineModeId: nil,
            connectionTime: nil
        )
    }
    
    static var cancelledPreview: BilbyTripAttributes.ContentState {
        BilbyTripAttributes.ContentState(
            phase: .waiting,
            nextEventTime: Date().addingTimeInterval(20 * 60),
            delayMinutes: 0,
            isDelayed: false,
            isCancelled: true,
            currentStopName: "Epping",
            nextStopName: "Eastwood",
            stopsRemaining: 8,
            platform: "Platform 1",
            currentLeg: 1,
            progress: 0.0,
            hasAlert: true,
            alertMessage: "Service cancelled",
            nextLineNumber: nil,
            nextLineModeId: nil,
            connectionTime: nil
        )
    }
}
