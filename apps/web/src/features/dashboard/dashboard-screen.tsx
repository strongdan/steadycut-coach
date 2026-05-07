import { useQuery } from "@tanstack/react-query";

import { Card } from "../../components/card";
import { api } from "../../lib/api";
import { authStorage } from "../../lib/auth";

type DashboardResponse = {
  today: {
    aiCoachNudge: string;
    checklist: Array<{ key: string; label: string; completed: boolean }>;
    plan: {
      proteinTargetGrams: number;
      fiberTargetGrams: number;
      waterTargetLiters: number;
      stepTarget: number;
      eatingCutoffTime: string;
    } | null;
    mealTemplates: Array<{ id: string; name: string; mealType: string }>;
  };
};

export function DashboardScreen() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardResponse>("/dashboard/today", { token: authStorage.getToken() }),
  });

  const data = query.data?.today;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Today</p>
        <h1 className="mt-2 text-3xl font-semibold text-moss">Keep the plan boring enough to repeat.</h1>
      </div>

      <Card className="bg-moss text-white">
        <p className="text-sm font-medium text-white/75">Coach nudge</p>
        <p className="mt-2 text-lg font-semibold leading-7">{data?.aiCoachNudge ?? "Load today’s checklist to focus the day."}</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-moss">Today’s checklist</h2>
          <span className="text-sm text-ink/60">{query.isPending ? "Loading..." : `${data?.checklist.filter((item) => item.completed).length ?? 0}/${data?.checklist.length ?? 0}`}</span>
        </div>
        <div className="mt-4 space-y-3">
          {data?.checklist.map((item) => (
            <div key={item.key} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
              <div className={`h-5 w-5 rounded-full ${item.completed ? "bg-leaf" : "border border-black/20 bg-white"}`} />
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">Targets</p>
          <p className="mt-3 text-sm text-ink/80">Protein {data?.plan?.proteinTargetGrams ?? 0}g</p>
          <p className="text-sm text-ink/80">Fiber {data?.plan?.fiberTargetGrams ?? 0}g</p>
          <p className="text-sm text-ink/80">Water {data?.plan?.waterTargetLiters ?? 0}L</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">Structure</p>
          <p className="mt-3 text-sm text-ink/80">Walk target {data?.plan?.stepTarget ?? 0}</p>
          <p className="text-sm text-ink/80">Cutoff {data?.plan?.eatingCutoffTime ?? "--:--"}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-moss">Meal template ideas</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {data?.mealTemplates.map((template) => (
            <span key={template.id} className="rounded-full bg-sand px-3 py-2 text-xs font-semibold text-clay">
              {template.name}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
