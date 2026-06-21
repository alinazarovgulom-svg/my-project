import Foundation

struct Task: Identifiable, Codable {
    var id = UUID()
    var title: String
    var isCompleted: Bool = false
    var createdAt: Date = Date()
    var priority: Priority = .medium

    enum Priority: String, Codable, CaseIterable {
        case low = "Past"
        case medium = "O'rta"
        case high = "Yuqori"

        var color: String {
            switch self {
            case .low: return "green"
            case .medium: return "orange"
            case .high: return "red"
            }
        }
    }
}
