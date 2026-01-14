import ActivityKit
import WidgetKit
import SwiftUI

struct BilbyLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BilbyTripAttributes.self) { context in
            // Lock Screen / Banner UI
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Dynamic Island regions
                DynamicIslandExpandedRegion(.leading) {
                    ExpandedLeadingView(context: context)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ExpandedTrailingView(context: context)
                }
                DynamicIslandExpandedRegion(.center) {
                    ExpandedCenterView(context: context)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ExpandedBottomView(context: context)
                }
            } compactLeading: {
                CompactLeadingView(context: context)
            } compactTrailing: {
                CompactTrailingView(context: context)
            } minimal: {
                MinimalView(context: context)
            }
            .widgetURL(URL(string: "bilby://trip/\(context.attributes.tripId)"))
            .keylineTint(Color(hex: context.attributes.lineColor) ?? .blue)
        }
    }
}

// MARK: - Lock Screen View

struct LockScreenView: View {
    let context: ActivityViewContext<BilbyTripAttributes>
    
    var body: some View {
        VStack(spacing: 12) {
            // Header: Line badge + Destination + Countdown
            HStack(alignment: .top) {
                LineBadgeView(
                    lineNumber: context.attributes.lineNumber,
                    modeId: context.attributes.modeId,
                    color: Color(hex: context.attributes.lineColor) ?? .blue
                )
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.destinationName)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .lineLimit(1)
                    
                    HStack(spacing: 6) {
                        if let platform = context.state.platform {
                            Text(platform)
                                .font(.caption)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.secondary.opacity(0.2))
                                .cornerRadius(4)
                        }
                        
                        StatusBadge(state: context.state)
                    }
                }
                
                Spacer()
                
                CountdownView(state: context.state)
            }
            
            // Progress bar
            JourneyProgressView(
                progress: context.state.progress,
                phase: context.state.phase,
                color: Color(hex: context.attributes.lineColor) ?? .blue
            )
            
            // Stop info based on phase
            PhaseInfoView(context: context)
        }
        .padding(16)
        .activityBackgroundTint(Color(.systemBackground))
        .activitySystemActionForegroundColor(Color.primary)
    }
}

// MARK: - Dynamic Island Compact Views

struct CompactLeadingView: View {
    let context: ActivityViewContext<BilbyTripAttributes>
    
    var body: some View {
        LineBadgeView(
            lineNumber: context.attributes.lineNumber,
            modeId: context.attributes.modeId,
            color: Color(hex: context.attributes.lineColor) ?? .blue,
            size: .small
        )
    }
}

struct CompactTrailingView: View {
    let context: ActivityViewContext<BilbyTripAttributes>
    
    var body: some View {
        HStack(spacing: 4) {
            if context.state.phase == .onVehicle {
                Text("\(context.state.stopsRemaining)")
                    .font(.system(.body, design: .rounded))
                    .fontWeight(.bold)
                    .monospacedDigit()
                Image(systemName: "arrow.right")
                    .font(.caption2)
            } else {
                Text(context.state.countdownText)
                    .font(.system(.body, design: .rounded))
                    .fontWeight(.bold)
                    .monospacedDigit()
                if context.state.countdownText != "Now" {
                    Text("min")
                        .font(.caption2)
                }
            }
        }
        .foregroundColor(context.state.isDelayed ? .orange : .primary)
    }
}

// MARK: - Dynamic Island Minimal View

struct MinimalView: View {
    let context: ActivityViewContext<BilbyTripAttributes>
    
    var body: some View {
        Image(systemName: context.attributes.transportMode.systemImage)
            .font(.caption)
            .foregroundColor(Color(hex: context.attributes.lineColor) ?? .blue)
    }
}

// MARK: - Dynamic Island Expanded Views

struct ExpandedLeadingView: View {
    let context: ActivityViewContext<BilbyTripAttributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            LineBadgeView(
                lineNumber: context.attributes.lineNumber,
                modeId: context.attributes.modeId,
                color: Color(hex: context.attributes.lineColor) ?? .blue,
                size: .medium
            )
            
            Text(context.state.phase.displayName)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

struct ExpandedTrailingView: View {
    let context: ActivityViewContext<BilbyTripAttributes>
    
    var body: some View {
        VStack(alignment: .trailing, spacing: 4) {
            if context.state.isCancelled {
                Text("Cancelled")
                    .font(.headline)
                    .foregroundColor(.red)
            } else {
                HStack(spacing: 2) {
                    Text(context.state.countdownText)
                        .font(.system(.title2, design: .rounded))
                        .fontWeight(.bold)
                        .monospacedDigit()
                    if context.state.countdownText != "Now" {
                        Text("min")
                            .font(.caption)
                    }
                }
                .foregroundColor(context.state.isDelayed ? .orange : .primary)
            }
            
            if context.state.isDelayed && !context.state.isCancelled {
                Text("+\(context.state.delayMinutes)m")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
    }
}

struct ExpandedCenterView: View {
    let context: ActivityViewContext<BilbyTripAttributes>
    
    var body: some View {
        VStack(spacing: 2) {
            Text("to \(context.attributes.destinationName)")
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(1)
            
            if let platform = context.state.platform {
                Text(platform)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct ExpandedBottomView: View {
    let context: ActivityViewContext<BilbyTripAttributes>
    
    var body: some View {
        VStack(spacing: 8) {
            // Mini progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.secondary.opacity(0.3))
                        .frame(height: 4)
                    
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color(hex: context.attributes.lineColor) ?? .blue)
                        .frame(width: geometry.size.width * context.state.progress, height: 4)
                }
            }
            .frame(height: 4)
            
            // Current → Next stop
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.currentStopName)
                        .font(.caption)
                        .fontWeight(.medium)
                        .lineLimit(1)
                    Text("Current")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "arrow.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(context.state.nextStopName)
                        .font(.caption)
                        .fontWeight(.medium)
                        .lineLimit(1)
                    Text("\(context.state.stopsRemaining) stops")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            // Alert if present
            if context.state.hasAlert, let alertMessage = context.state.alertMessage {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.caption2)
                    Text(alertMessage)
                        .font(.caption2)
                        .lineLimit(1)
                }
                .foregroundColor(.orange)
            }
        }
    }
}

// MARK: - Supporting Views

struct LineBadgeView: View {
    let lineNumber: String
    let modeId: Int
    let color: Color
    var size: BadgeSize = .medium
    
    enum BadgeSize {
        case small, medium, large
        
        var fontSize: Font {
            switch self {
            case .small: return .caption2
            case .medium: return .caption
            case .large: return .subheadline
            }
        }
        
        var padding: CGFloat {
            switch self {
            case .small: return 4
            case .medium: return 6
            case .large: return 8
            }
        }
        
        var minWidth: CGFloat {
            switch self {
            case .small: return 24
            case .medium: return 32
            case .large: return 40
            }
        }
    }
    
    var body: some View {
        Text(lineNumber)
            .font(size.fontSize)
            .fontWeight(.bold)
            .foregroundColor(.white)
            .padding(.horizontal, size.padding)
            .padding(.vertical, size.padding / 2)
            .frame(minWidth: size.minWidth)
            .background(color)
            .cornerRadius(6)
    }
}

struct StatusBadge: View {
    let state: BilbyTripAttributes.ContentState
    
    var body: some View {
        HStack(spacing: 4) {
            if state.isCancelled {
                Image(systemName: "xmark.circle.fill")
                    .font(.caption2)
                Text("Cancelled")
                    .font(.caption)
            } else if state.isDelayed {
                Image(systemName: "clock.fill")
                    .font(.caption2)
                Text("+\(state.delayMinutes)m")
                    .font(.caption)
            } else {
                Image(systemName: "checkmark.circle.fill")
                    .font(.caption2)
                Text("On time")
                    .font(.caption)
            }
        }
        .foregroundColor(statusColor)
    }
    
    var statusColor: Color {
        if state.isCancelled { return .red }
        if state.isDelayed { return .orange }
        return .green
    }
}

struct CountdownView: View {
    let state: BilbyTripAttributes.ContentState
    
    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            if state.isCancelled {
                Text("—")
                    .font(.system(.title, design: .rounded))
                    .fontWeight(.bold)
                    .foregroundColor(.red)
            } else {
                Text(state.countdownText)
                    .font(.system(.title, design: .rounded))
                    .fontWeight(.bold)
                    .monospacedDigit()
                    .foregroundColor(state.isDelayed ? .orange : .primary)
                
                if state.countdownText != "Now" {
                    Text("min")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
}

struct JourneyProgressView: View {
    let progress: Double
    let phase: TripPhase
    let color: Color
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color.secondary.opacity(0.2))
                    .frame(height: 6)
                
                RoundedRectangle(cornerRadius: 3)
                    .fill(color)
                    .frame(width: max(6, geometry.size.width * progress), height: 6)
                    .animation(.easeInOut(duration: 0.3), value: progress)
            }
        }
        .frame(height: 6)
    }
}

struct PhaseInfoView: View {
    let context: ActivityViewContext<BilbyTripAttributes>
    
    var body: some View {
        HStack {
            // Current location indicator
            HStack(spacing: 6) {
                Circle()
                    .fill(Color(hex: context.attributes.lineColor) ?? .blue)
                    .frame(width: 8, height: 8)
                
                Text(context.state.currentStopName)
                    .font(.subheadline)
                    .lineLimit(1)
            }
            
            Spacer()
            
            // Next action based on phase
            switch context.state.phase {
            case .walkingToStop:
                WalkingDirectionView(state: context.state)
                
            case .waiting:
                if context.state.stopsRemaining > 0 {
                    Text("\(context.state.stopsRemaining) stops to go")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
            case .onVehicle:
                HStack(spacing: 4) {
                    Text("Next:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(context.state.nextStopName)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                
            case .transferring:
                VStack(alignment: .trailing, spacing: 2) {
                    // Show walking directions if available
                    if context.state.walkingDistanceMeters != nil {
                        WalkingDirectionView(state: context.state)
                    }
                    // Show next connection
                    if let nextLine = context.state.nextLineNumber {
                        HStack(spacing: 4) {
                            Text("→")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(nextLine)
                                .font(.caption)
                                .fontWeight(.bold)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .background(Color.secondary.opacity(0.2))
                                .cornerRadius(4)
                        }
                    }
                }
                
            case .arriving:
                HStack(spacing: 4) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                    Text("Arriving soon")
                        .font(.caption)
                        .foregroundColor(.green)
                }
                
            case .completed:
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption)
                        .foregroundColor(.green)
                    Text("Journey complete")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }
        }
    }
}

// MARK: - Walking Direction View

struct WalkingDirectionView: View {
    let state: BilbyTripAttributes.ContentState
    
    var body: some View {
        HStack(spacing: 6) {
            // Walking icon with compass direction
            HStack(spacing: 2) {
                Image(systemName: "figure.walk")
                    .font(.caption)
                    .foregroundColor(.blue)
                
                if let direction = state.compassDirection {
                    Image(systemName: compassArrow(for: direction))
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
            }
            
            // Distance and ETA
            VStack(alignment: .leading, spacing: 0) {
                if let distance = state.walkingDistanceText {
                    Text(distance)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                
                if let eta = state.walkingEtaText {
                    Text(eta)
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    private func compassArrow(for direction: String) -> String {
        switch direction {
        case "N": return "arrow.up"
        case "NE": return "arrow.up.right"
        case "E": return "arrow.right"
        case "SE": return "arrow.down.right"
        case "S": return "arrow.down"
        case "SW": return "arrow.down.left"
        case "W": return "arrow.left"
        case "NW": return "arrow.up.left"
        default: return "arrow.up"
        }
    }
}

// MARK: - Color Extension

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Previews

#Preview("Lock Screen - Waiting", as: .content, using: BilbyTripAttributes.preview) {
    BilbyLiveActivity()
} contentStates: {
    BilbyTripAttributes.ContentState.waitingPreview
}

#Preview("Lock Screen - On Board", as: .content, using: BilbyTripAttributes.preview) {
    BilbyLiveActivity()
} contentStates: {
    BilbyTripAttributes.ContentState.onBoardPreview
}

#Preview("Lock Screen - Delayed", as: .content, using: BilbyTripAttributes.preview) {
    BilbyLiveActivity()
} contentStates: {
    BilbyTripAttributes.ContentState.delayedPreview
}

#Preview("Lock Screen - Cancelled", as: .content, using: BilbyTripAttributes.preview) {
    BilbyLiveActivity()
} contentStates: {
    BilbyTripAttributes.ContentState.cancelledPreview
}

#Preview("Dynamic Island Compact", as: .dynamicIsland(.compact), using: BilbyTripAttributes.preview) {
    BilbyLiveActivity()
} contentStates: {
    BilbyTripAttributes.ContentState.waitingPreview
    BilbyTripAttributes.ContentState.onBoardPreview
}

#Preview("Dynamic Island Minimal", as: .dynamicIsland(.minimal), using: BilbyTripAttributes.preview) {
    BilbyLiveActivity()
} contentStates: {
    BilbyTripAttributes.ContentState.waitingPreview
}

#Preview("Dynamic Island Expanded", as: .dynamicIsland(.expanded), using: BilbyTripAttributes.preview) {
    BilbyLiveActivity()
} contentStates: {
    BilbyTripAttributes.ContentState.waitingPreview
    BilbyTripAttributes.ContentState.onBoardPreview
    BilbyTripAttributes.ContentState.arrivingPreview
}
