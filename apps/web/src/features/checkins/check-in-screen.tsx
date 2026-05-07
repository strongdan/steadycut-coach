import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "../../components/button";
import { Card } from "../../components/card";
import { api } from "../../lib/api";
import { authStorage } from "../../lib/auth";

export function CheckInScreen() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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

  const photoMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("date", form.date);
      formData.append("label", "Daily Check-in");

      return api<{ photo: any }>("/progress-photos", {
        method: "POST",
        token: authStorage.getToken(),
        body: formData,
      });
    },
    onSuccess: (data) => {
      setPhotoUrl(data.photo.fileUrl);
    },
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      photoMutation.mutate(file);
    }
  };

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
        
        <div className="space-y-2">
          <span className="text-sm font-medium text-ink/75">Progress Photo</span>
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 bg-canvas p-4 text-center">
            {photoUrl ? (
              <img src={photoUrl} alt="Progress" className="h-48 w-full rounded-lg object-cover" />
            ) : (
              <label className="cursor-pointer space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sand text-moss">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </div>
                <span className="block text-sm font-medium text-moss">
                  {photoMutation.isPending ? "Uploading..." : "Tap to add photo"}
                </span>
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} disabled={photoMutation.isPending} />
              </label>
            )}
          </div>
        </div>

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
