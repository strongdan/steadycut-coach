import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "../../components/button";
import { Card } from "../../components/card";
import { api } from "../../lib/api";
import { authStorage } from "../../lib/auth";

const today = new Date();
const plusMonths = new Date(today);
plusMonths.setMonth(today.getMonth() + 4);

export function PlanScreen() {
  const [form, setForm] = useState({
    name: "4-Month Fat Loss Plan",
    startDate: today.toISOString().slice(0, 10),
    endDate: plusMonths.toISOString().slice(0, 10),
    startingWeight: 190,
    goalWeight: 175,
    proteinTargetGrams: 170,
    fiberTargetGrams: 40,
    waterTargetLiters: 3.5,
    stepTarget: 9000,
    strengthSessionsPerWeek: 4,
    cardioSessionsPerWeek: 3,
    eatingCutoffTime: "20:00",
    alcoholGoal: "0 drinks ideal",
  });

  const mutation = useMutation({
    mutationFn: () =>
      api("/plan", {
        method: "POST",
        token: authStorage.getToken(),
        body: JSON.stringify({
          ...form,
          planStrictness: "standard",
          preferredMealTemplates: ["Chia protein pudding", "Egg whites with spinach, beans, salsa", "Taco bowl"],
          preferredTrainingTypes: ["strength", "walk", "cardio"],
          reminderPreferences: ["morning", "cutoff"],
        }),
      }),
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Plan setup</p>
        <h1 className="mt-2 text-3xl font-semibold text-moss">Set the defaults once.</h1>
        <p className="mt-2 text-sm text-ink/70">The app should reduce decisions, not create more of them.</p>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" type="date" value={form.startDate} onChange={(value) => setForm({ ...form, startDate: value })} />
          <Field label="End date" type="date" value={form.endDate} onChange={(value) => setForm({ ...form, endDate: value })} />
          <Field label="Current weight" type="number" value={String(form.startingWeight)} onChange={(value) => setForm({ ...form, startingWeight: Number(value) })} />
          <Field label="Goal weight" type="number" value={String(form.goalWeight)} onChange={(value) => setForm({ ...form, goalWeight: Number(value) })} />
          <Field label="Protein target" type="number" value={String(form.proteinTargetGrams)} onChange={(value) => setForm({ ...form, proteinTargetGrams: Number(value) })} />
          <Field label="Fiber target" type="number" value={String(form.fiberTargetGrams)} onChange={(value) => setForm({ ...form, fiberTargetGrams: Number(value) })} />
          <Field label="Water liters" type="number" value={String(form.waterTargetLiters)} onChange={(value) => setForm({ ...form, waterTargetLiters: Number(value) })} />
          <Field label="Steps target" type="number" value={String(form.stepTarget)} onChange={(value) => setForm({ ...form, stepTarget: Number(value) })} />
          <Field label="Strength / week" type="number" value={String(form.strengthSessionsPerWeek)} onChange={(value) => setForm({ ...form, strengthSessionsPerWeek: Number(value) })} />
          <Field label="Cardio / week" type="number" value={String(form.cardioSessionsPerWeek)} onChange={(value) => setForm({ ...form, cardioSessionsPerWeek: Number(value) })} />
          <Field label="Cutoff time" type="time" value={form.eatingCutoffTime} onChange={(value) => setForm({ ...form, eatingCutoffTime: value })} />
          <Field label="Alcohol goal" type="text" value={form.alcoholGoal} onChange={(value) => setForm({ ...form, alcoholGoal: value })} />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save active plan"}
        </Button>
        {mutation.isSuccess ? <p className="text-sm text-leaf">Plan saved. You can revise targets later without rebuilding the system.</p> : null}
        {mutation.error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  type,
  onChange,
}: {
  label: string;
  value: string;
  type: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-ink/75">{label}</span>
      <input
        className="min-h-12 w-full rounded-2xl border border-black/10 bg-canvas px-4"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
