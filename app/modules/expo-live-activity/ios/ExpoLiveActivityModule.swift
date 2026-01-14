import ExpoModulesCore
import ActivityKit

public class ExpoLiveActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoLiveActivity")
        
        // Check if Live Activities are supported and enabled
        Function("areActivitiesEnabled") { () -> Bool in
            if #available(iOS 16.1, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }
        
        // Start a new Live Activity
        AsyncFunction("startActivity") { (attributesJson: String, stateJson: String) -> [String: Any]? in
            guard #available(iOS 16.1, *) else {
                throw LiveActivityError.unsupportedOS
            }
            
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                throw LiveActivityError.activitiesDisabled
            }
            
            guard let attributesData = attributesJson.data(using: .utf8),
                  let stateData = stateJson.data(using: .utf8) else {
                throw LiveActivityError.invalidJson
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            
            let attributes = try decoder.decode(BilbyTripAttributes.self, from: attributesData)
            let contentState = try decoder.decode(BilbyTripAttributes.ContentState.self, from: stateData)
            
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: contentState, staleDate: nil),
                pushType: .token
            )
            
            // Get push token asynchronously
            var pushTokenString: String? = nil
            if let pushToken = activity.pushToken {
                pushTokenString = pushToken.map { String(format: "%02x", $0) }.joined()
            }
            
            return [
                "activityId": activity.id,
                "pushToken": pushTokenString as Any
            ]
        }
        
        // Update an existing Live Activity
        AsyncFunction("updateActivity") { (activityId: String, stateJson: String) -> Bool in
            guard #available(iOS 16.1, *) else {
                throw LiveActivityError.unsupportedOS
            }
            
            guard let stateData = stateJson.data(using: .utf8) else {
                throw LiveActivityError.invalidJson
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            
            let contentState = try decoder.decode(BilbyTripAttributes.ContentState.self, from: stateData)
            
            for activity in Activity<BilbyTripAttributes>.activities {
                if activity.id == activityId {
                    Task {
                        await activity.update(
                            ActivityContent(state: contentState, staleDate: nil)
                        )
                    }
                    return true
                }
            }
            
            throw LiveActivityError.activityNotFound
        }
        
        // End a Live Activity
        AsyncFunction("endActivity") { (activityId: String, stateJson: String?, dismissPolicy: String?) -> Bool in
            guard #available(iOS 16.1, *) else {
                throw LiveActivityError.unsupportedOS
            }
            
            var finalState: BilbyTripAttributes.ContentState? = nil
            if let stateJson = stateJson, let stateData = stateJson.data(using: .utf8) {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                finalState = try decoder.decode(BilbyTripAttributes.ContentState.self, from: stateData)
            }
            
            let policy: ActivityUIDismissalPolicy
            switch dismissPolicy {
            case "immediate":
                policy = .immediate
            case "default":
                policy = .default
            default:
                policy = .default
            }
            
            for activity in Activity<BilbyTripAttributes>.activities {
                if activity.id == activityId {
                    Task {
                        if let state = finalState {
                            await activity.end(
                                ActivityContent(state: state, staleDate: nil),
                                dismissalPolicy: policy
                            )
                        } else {
                            await activity.end(dismissalPolicy: policy)
                        }
                    }
                    return true
                }
            }
            
            throw LiveActivityError.activityNotFound
        }
        
        // End all Live Activities
        AsyncFunction("endAllActivities") { () -> Int in
            guard #available(iOS 16.1, *) else {
                throw LiveActivityError.unsupportedOS
            }
            
            var count = 0
            for activity in Activity<BilbyTripAttributes>.activities {
                Task {
                    await activity.end(dismissalPolicy: .immediate)
                }
                count += 1
            }
            return count
        }
        
        // Get all active Live Activity IDs
        Function("getActiveActivities") { () -> [[String: Any]] in
            guard #available(iOS 16.1, *) else {
                return []
            }
            
            return Activity<BilbyTripAttributes>.activities.map { activity in
                var dict: [String: Any] = [
                    "activityId": activity.id,
                    "tripId": activity.attributes.tripId,
                    "destinationName": activity.attributes.destinationName
                ]
                
                if let pushToken = activity.pushToken {
                    dict["pushToken"] = pushToken.map { String(format: "%02x", $0) }.joined()
                }
                
                return dict
            }
        }
        
        // Observe push token updates for an activity
        AsyncFunction("observePushToken") { (activityId: String, promise: Promise) in
            guard #available(iOS 16.1, *) else {
                throw LiveActivityError.unsupportedOS
            }
            
            for activity in Activity<BilbyTripAttributes>.activities {
                if activity.id == activityId {
                    Task {
                        for await pushToken in activity.pushTokenUpdates {
                            let tokenString = pushToken.map { String(format: "%02x", $0) }.joined()
                            promise.resolve(tokenString)
                            return
                        }
                    }
                    return
                }
            }
            
            throw LiveActivityError.activityNotFound
        }
    }
}

enum LiveActivityError: Error, LocalizedError {
    case unsupportedOS
    case activitiesDisabled
    case invalidJson
    case activityNotFound
    
    var errorDescription: String? {
        switch self {
        case .unsupportedOS:
            return "Live Activities require iOS 16.1 or later"
        case .activitiesDisabled:
            return "Live Activities are disabled by the user"
        case .invalidJson:
            return "Invalid JSON data provided"
        case .activityNotFound:
            return "Activity not found"
        }
    }
}
