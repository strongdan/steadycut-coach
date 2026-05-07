import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "../../components/button";
import { Card } from "../../components/card";
import { api } from "../../lib/api";
import { authStorage } from "../../lib/auth";

export function CheckInScreen() {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    waterLiters: 3,
    proteinStatus: "yes",
    fiberStatus: "partial",
    ateAfterCutoff: false,
    alcoholDrinks: 0,
    strengthStatus: "none",
    cardioType: "walk",
    cardioMinutes: 30,
    hungerScore: 3,
    energyScore: 3,
    moodScore: 3,
    sleepQualityScore: 3,
    weight: "",
    steps: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      api<{ coachFeedback: { summary: string } }>("/check-ins", {
        method: "POST",
        token: authStorage.getToken(),
        body: JSON.stringify({
          ...form,
          weight: form.weight ? Number(form.weight) : null,
          steps: form.steps ? Number(form.steps) : null,
        }),
      }),
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Daily check-in</p>
        <h1 className="mt-2 text-3xl font-semibold text-moss">One honest snapshot beats perfect tracking.</h1>
      </div>

      <Card className="space-y-4">
        <Field label="Water liters" value={String(form.waterLiters)} onChange={(value) => setForm({ ...form, waterLiters: Number(value) })} />
        <Select label="Protein hit" value={form.proteinStatus} options={["yes", "partial", "no"]} onChange={(value) => setForm({ ...form, proteinStatus: value })} />
        <Select label="Fiber hit" value={form.fiberStatus} options={["yes", "partial", "no"]} onChange={(value) => setForm({ ...form, fiberStatus: value })} />
        <Field label="Weight optional" value={form.weight} onChange={(value) => setForm({ ...form, weight: value })} />
        <Field label="Steps optional" value={form.steps} onChange={(value) => setForm({ ...form, steps: value })} />
        <Select label="Strength" value={form.strengthStatus} options={["none", "light", "full"]} onChange={(value) => setForm({ ...form, strengthStatus: value })} />
        <Select label="Cardio type" value={form.cardioType} options={["none", "walk", "run", "swim", "bike", "hockey", "other"]} onChange={(value) => setForm({ ...form, cardioType: value })} />
        <Field label="Cardio minutes" value={String(form.cardioMinutes)} onChange={(value) => setForm({ ...form, cardioMinutes: Number(value) })} />
        <ScoreRow label="Hunger" value={form.hungerScore} onChange={(value) => setForm({ ...form, hungerScore: value })} />
        <ScoreRow label="Energy" value={form.energyScore} onChange={(value) => setForm({ ...form, energyScore: value })} />
        <ScoreRow label="Mood" value={form.moodScore} onChange={(value) => setForm({ ...form, moodScore: value })} />
        <ScoreRow label="Sleep quality" value={form.sleepQualityScore} onChange={(value) => setForm({ ...form, sleepQualityScore: value })} />
        <label className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3 text-sm">
          <span>Ate after cutoff</span>
          <input type="checkbox" checked={form.ateAfterCutoff} onChange={(e) => setForm({ ...form, ateAfterCutoff: e.target.checked })} />
        </label>
        <Field label="Alcohol drinks" value={String(form.alcoholDrinks)} onChange={(value) => setForm({ ...form, alcoholDrinks: Number(value) })} />
        <textarea
          className="min-h-24 w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3"
          placeholder="Notes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting..." : "Submit check-in"}
        </Button>
      </Card>

      {mutation.data ? (
        <Card className="bg-sand">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Coach feedback</p>
          <p className="mt-2 text-sm leading-6 text-ink">{mutation.data.coachFeedback.summary}</p>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-ink/75">{label}</span>
      <input className="min-h-12 w-full rounded-2xl border border-black/10 bg-canvas px-4" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-ink/75">{label}</span>
      <select className="min-h-12 w-full rounded-2xl border border-black/10 bg-canvas px-4" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink/75">{label}</span>
        <span className="text-ink/50">{value}/5</span>
      </div>
      <input type="range" min={1} max={5} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-moss" />
    </div>
  );
}
