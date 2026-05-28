import React from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

function statusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle2 size={13} className="text-green-400" />;
    case "in_progress": return <Loader2 size={13} className="text-blue-400 animate-spin" />;
    default: return <Circle size={13} className="text-gray-600" />;
  }
}

const statusLabel = (s: string) => s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1);

export default function WorkPanel({ todos }: { todos: TodoItem[] }) {
  const sorted = [...todos].sort((a, b) => {
    const order: Record<string, number> = { in_progress: 0, pending: 1, completed: 2 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });

  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-600 text-xs">
        <span className="text-2xl mb-2">📋</span>
        <p className="font-medium">No tasks yet</p>
        <p className="text-[10px] mt-1">Agent tasks appear here</p>
      </div>
    );
  }

  return (
    <ul className="py-1">
      {sorted.map((todo, i) => (
        <li
          key={i}
          className={`flex items-center gap-2 px-3 py-2 border-b border-dark-800/50 text-xs ${
            todo.status === "completed" ? "opacity-60" : ""
          }`}
        >
          <span className="flex-shrink-0">{statusIcon(todo.status)}</span>
          <span className={`flex-1 ${todo.status === "completed" ? "line-through" : ""}`}>
            {todo.content}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
              todo.status === "in_progress"
                ? "bg-blue-500/20 text-blue-400"
                : todo.status === "completed"
                ? "bg-green-500/20 text-green-400"
                : "bg-dark-800 text-gray-500"
            }`}
          >
            {statusLabel(todo.status)}
          </span>
        </li>
      ))}
    </ul>
  );
}
