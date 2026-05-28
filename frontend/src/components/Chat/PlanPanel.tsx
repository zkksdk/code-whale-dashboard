import React from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

export interface PlanStep {
  step: string;
  status: "pending" | "in_progress" | "completed";
}

export interface PlanData {
  explanation?: string;
  steps: PlanStep[];
}

function statusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle2 size={13} className="text-green-400" />;
    case "in_progress": return <Loader2 size={13} className="text-blue-400 animate-spin" />;
    default: return <Circle size={13} className="text-gray-600" />;
  }
}

const statusLabel = (s: string) => s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1);

export default function PlanPanel({ plan }: { plan: PlanData }) {
  if (!plan.steps || plan.steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-600 text-xs">
        <span className="text-2xl mb-2">📋</span>
        <p className="font-medium">No plan yet</p>
        <p className="text-[10px] mt-1">Agent plan steps appear here</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {plan.explanation && (
        <div className="mx-2 my-2 px-3 py-2 bg-dark-950/50 border-l-2 border-whale-600 rounded-r text-xs text-gray-400 leading-relaxed">
          {plan.explanation}
        </div>
      )}
      <ul className="py-1">
        {plan.steps.map((step, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 px-3 py-2 border-b border-dark-800/50 text-xs ${
              step.status === "completed" ? "opacity-60" : ""
            }`}
          >
            <span className="flex-shrink-0">{statusIcon(step.status)}</span>
            <span className={`flex-1 ${step.status === "completed" ? "line-through" : ""}`}>
              {step.step}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                step.status === "in_progress"
                  ? "bg-blue-500/20 text-blue-400"
                  : step.status === "completed"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-dark-800 text-gray-500"
              }`}
            >
              {statusLabel(step.status)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
