import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = TaskViewModel()
    @State private var showingAddTask = false
    @State private var selectedFilter: FilterOption = .all

    enum FilterOption: String, CaseIterable {
        case all = "Barchasi"
        case pending = "Bajarilmagan"
        case completed = "Bajarilgan"
    }

    var filteredTasks: [Task] {
        switch selectedFilter {
        case .all: return viewModel.tasks
        case .pending: return viewModel.pendingTasks
        case .completed: return viewModel.completedTasks
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Stats banner
                HStack {
                    StatCard(title: "Jami", value: viewModel.tasks.count, color: .blue)
                    StatCard(title: "Kutilmoqda", value: viewModel.pendingTasks.count, color: .orange)
                    StatCard(title: "Tugallangan", value: viewModel.completedTasks.count, color: .green)
                }
                .padding()
                .background(Color(.systemGroupedBackground))

                // Filter picker
                Picker("Filter", selection: $selectedFilter) {
                    ForEach(FilterOption.allCases, id: \.self) { option in
                        Text(option.rawValue).tag(option)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.vertical, 8)

                // Task list
                if filteredTasks.isEmpty {
                    EmptyStateView(filter: selectedFilter)
                } else {
                    List {
                        ForEach(filteredTasks) { task in
                            TaskRow(task: task) {
                                viewModel.toggleCompletion(task)
                            }
                        }
                        .onDelete { offsets in
                            let ids = offsets.map { filteredTasks[$0].id }
                            viewModel.tasks.removeAll { ids.contains($0.id) }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Vazifalar")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddTask = true }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                }
            }
            .sheet(isPresented: $showingAddTask) {
                AddTaskView(viewModel: viewModel)
            }
        }
    }
}

struct StatCard: View {
    let title: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.title2.bold())
                .foregroundColor(color)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(color.opacity(0.1))
        .cornerRadius(10)
    }
}

struct TaskRow: View {
    let task: Task
    let onToggle: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundColor(task.isCompleted ? .green : .gray)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .strikethrough(task.isCompleted)
                    .foregroundColor(task.isCompleted ? .secondary : .primary)
                Text(task.priority.rawValue)
                    .font(.caption)
                    .foregroundColor(priorityColor(task.priority))
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }

    private func priorityColor(_ priority: Task.Priority) -> Color {
        switch priority {
        case .low: return .green
        case .medium: return .orange
        case .high: return .red
        }
    }
}

struct EmptyStateView: View {
    let filter: ContentView.FilterOption

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))
            Text(filter == .completed ? "Hali tugallangan vazifa yo'q" : "Vazifalar yo'q")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct AddTaskView: View {
    @ObservedObject var viewModel: TaskViewModel
    @Environment(\.dismiss) var dismiss
    @State private var title = ""
    @State private var priority: Task.Priority = .medium

    var body: some View {
        NavigationView {
            Form {
                Section("Vazifa nomi") {
                    TextField("Masalan: Kitob o'qish", text: $title)
                }

                Section("Muhimlik darajasi") {
                    Picker("Prioritet", selection: $priority) {
                        ForEach(Task.Priority.allCases, id: \.self) { p in
                            Text(p.rawValue).tag(p)
                        }
                    }
                    .pickerStyle(.segmented)
                }
            }
            .navigationTitle("Yangi vazifa")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Qo'shish") {
                        viewModel.addTask(title: title, priority: priority)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
