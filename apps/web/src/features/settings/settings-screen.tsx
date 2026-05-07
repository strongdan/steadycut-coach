import { useState } from "react";

import { Card } from "../../components/card";

type ReminderKey = "morning" | "meal" | "cutoff" | "weekly" | "missed_check_in" | "motivation";
type Tone = "direct" | "supportive" | "neutral";
type Units = "imperial" | "metric";

const reminderLabels: Record<ReminderKey, string> = {
  morning: "Morning reset",
  meal: "Meal pregame",
  cutoff: "Evening cutoff",
  weekly: "Weekly review",
  missed_check_in: "Missed check-in",
  motivation: "Motivation nudge",
};

const reminderKeys: ReminderKey[] = ["morning", "meal", "cutoff", "weekly", "missed_check_in", "motivation"];
const metricOptions = ["weight", "waist", "photos", "steps", "water", "protein", "fiber", "sleep", "energy", "mood"];

function ToggleRow({
  label,
  checked,
  onChange,
  time,
  onTimeChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  time: string;
  onTimeChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-sand/70 bg-sand/40 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink/55">Planned locally for now. Delivery comes later.</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(event) => onTimeChange(event.target.value)}
          className="h-11 rounded-2xl border border-sand bg-white px-3 text-sm text-ink outline-none focus:border-moss"
          aria-label={`${label} reminder time`}
          disabled={!checked}
        />
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`h-11 min-w-20 rounded-full px-4 text-sm font-semibold transition ${
            checked ? "bg-moss text-white" : "bg-white text-ink/65 ring-1 ring-sand"
          }`}
          aria-pressed={checked}
        >
          {checked ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}

function PillButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-ink text-white" : "bg-white text-ink/70 ring-1 ring-sand"
      }`}
    >
      {children}
    </button>
  );
}

export function SettingsScreen() {
  const [smsConsent, setSmsConsent] = useState(false);
  const [tone, setTone] = useState<Tone>("supportive");
  const [units, setUnits] = useState<Units>("imperial");
  const [reminders, setReminders] = useState<Record<ReminderKey, boolean>>({
    morning: true,
    meal: true,
    cutoff: true,
    weekly: false,
    missed_check_in: true,
    motivation: false,
  });
  const [times, setTimes] = useState<Record<ReminderKey, string>>({
    morning: "07:15",
    meal: "12:00",
    cutoff: "19:15",
    weekly: "09:00",
    missed_check_in: "16:30",
    motivation: "15:30",
  });
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(["weight", "water", "protein", "fiber", "sleep"]);

  const reminderSummary = reminderKeys
    .filter((key) => reminders[key])
    .map((key) => `${reminderLabels[key]} at ${times[key]}`)
    .join(" • ");

  return (
    <div className="space-y-4 pb-24">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Settings</p>
        <h1 className="text-3xl font-semibold text-moss">Reminders and coach preferences.</h1>
        <p className="text-sm text-ink/70">This screen is draft state only. Nothing here is persisted yet, and the reminder system will come online in a later phase.</p>
      </div>

      <Card className="space-y-3 border border-moss/10 bg-moss/5">
        <p className="text-sm font-semibold text-moss">Coming next</p>
        <ul className="space-y-2 text-sm text-ink/75">
          <li>SMS consent storage and Twilio delivery wiring.</li>
          <li>Server-backed reminder schedules and dashboard personalization.</li>
          <li>Coach tone and metric preferences feeding the daily summary.</li>
        </ul>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">SMS consent placeholder</p>
          <p className="mt-1 text-sm text-ink/65">This is a local toggle for now. Real consent capture and STOP handling will be added when SMS is wired up.</p>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-3xl border border-sand/70 bg-sand/40 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">I consent to SMS reminders</p>
            <p className="text-xs text-ink/55">Needed before any reminder or coach text can be sent.</p>
          </div>
          <input
            type="checkbox"
            checked={smsConsent}
            onChange={(event) => setSmsConsent(event.target.checked)}
            className="h-5 w-5 rounded border-sand text-moss focus:ring-moss"
          />
        </label>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">Reminder schedule</p>
          <p className="mt-1 text-sm text-ink/65">Tune the draft times now. Delivery rules will be connected later.</p>
        </div>
        <div className="space-y-3">
          {reminderKeys.map((key) => (
            <ToggleRow
              key={key}
              label={reminderLabels[key]}
              checked={reminders[key]}
              onChange={(next) => setReminders((current) => ({ ...current, [key]: next }))}
              time={times[key]}
              onTimeChange={(next) => setTimes((current) => ({ ...current, [key]: next }))}
            />
          ))}
        </div>
        <p className="text-xs text-ink/55">Current draft: {reminderSummary || "No reminders enabled."}</p>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">Coaching tone</p>
          <p className="mt-1 text-sm text-ink/65">This will shape short nudges, check-in feedback, and weekly review language.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PillButton active={tone === "direct"} onClick={() => setTone("direct")}>Direct</PillButton>
          <PillButton active={tone === "supportive"} onClick={() => setTone("supportive")}>Supportive</PillButton>
          <PillButton active={tone === "neutral"} onClick={() => setTone("neutral")}>Neutral</PillButton>
        </div>
        <p className="text-xs text-ink/55">Selected tone: {tone}</p>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">Units</p>
          <p className="mt-1 text-sm text-ink/65">A future plan setting for the dashboard, check-ins, and reminders.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PillButton active={units === "imperial"} onClick={() => setUnits("imperial")}>Imperial</PillButton>
          <PillButton active={units === "metric"} onClick={() => setUnits("metric")}>Metric</PillButton>
        </div>
        <p className="text-xs text-ink/55">Current units: {units}</p>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">Dashboard metrics preferences</p>
          <p className="mt-1 text-sm text-ink/65">These are placeholders for the customizable dashboard layout phase.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metricOptions.map((metric) => {
            const enabled = visibleMetrics.includes(metric);
            return (
              <button
                key={metric}
                type="button"
                onClick={() =>
                  setVisibleMetrics((current) =>
                    current.includes(metric) ? current.filter((item) => item !== metric) : [...current, metric],
                  )
                }
                className={`rounded-3xl px-3 py-3 text-left text-sm font-semibold transition ${
                  enabled ? "bg-clay text-white" : "bg-white text-ink/70 ring-1 ring-sand"
                }`}
              >
                {metric}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink/55">
          Selected for the future dashboard: {visibleMetrics.length ? visibleMetrics.join(", ") : "none"}
        </p>
      </Card>
    </div>
  );
}
