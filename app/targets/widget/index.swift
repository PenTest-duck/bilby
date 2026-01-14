import WidgetKit
import SwiftUI

@main
struct exportWidgets: WidgetBundle {
    var body: some Widget {
        // Home screen widgets
        widget()
        widgetControl()
        
        // Live Activities
        BilbyLiveActivity()
    }
}
