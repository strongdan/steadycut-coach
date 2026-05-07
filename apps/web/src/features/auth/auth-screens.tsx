import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import { Button } from "../../components/button";
import { Card } from "../../components/card";
import { api } from "../../lib/api";
import { authStorage } from "../../lib/auth";

type AuthResponse = {
  token: string;
  requiresVerification?: boolean;
};

const baseFields = {
  email: "",
  password: "",
  name: "",
  phoneNumber: "",
};

export function LandingScreen() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-4 pb-10 pt-8 text-ink">
      <div>
        <div className="mb-8 inline-flex rounded-full bg-sand px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-clay">
          4-month coaching PWA
        </div>
        <h1 className="max-w-xs text-4xl font-semibold leading-tight text-moss">
          A practical fat-loss coach built around repeatable rules.
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink/75">
          Walk daily. Pregame meals with protein, fiber, and water. Train hard enough to keep muscle. Review patterns weekly, not obsessively.
        </p>
      </div>

      <Card className="space-y-4 bg-moss text-white">
        <p className="text-sm text-white/80">Phase 1 includes auth, plan setup, dashboard, and daily check-ins.</p>
        <div className="grid grid-cols-2 gap-3">
          <a href="/register" className="rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-moss">
            Create account
          </a>
          <a href="/login" className="rounded-full border border-white/30 px-4 py-3 text-center text-sm font-semibold text-white">
            Log in
          </a>
        </div>
      </Card>
    </div>
  );
}

export function RegisterScreen() {
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [form, setForm] = useState(baseFields);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      let recaptchaToken = "";
      if (executeRecaptcha) {
        recaptchaToken = await executeRecaptcha("register");
      }

      return api<AuthResponse & { user: { name: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          recaptchaToken,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          units: "imperial",
        }),
      });
    },
    onSuccess: ({ token, requiresVerification }) => {
      authStorage.setToken(token);
      if (requiresVerification) {
        setShowOtp(true);
      } else {
        navigate("/app/plan");
      }
    },
  });

  const otpMutation = useMutation({
    mutationFn: () =>
      api("/auth/verify-otp", {
        method: "POST",
        token: authStorage.getToken(),
        body: JSON.stringify({ otp }),
      }),
    onSuccess: () => {
      navigate("/app/plan");
    },
  });

  if (showOtp) {
    return (
      <AuthLayout title="Verify your number" subtitle="We sent a 6-digit code to your phone to verify your account.">
        <input className={inputClass} placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
        <Button onClick={() => otpMutation.mutate()} disabled={otpMutation.isPending}>
          {otpMutation.isPending ? "Verifying..." : "Verify & Continue"}
        </Button>
        {otpMutation.error ? <p className="text-sm text-red-600">{otpMutation.error.message}</p> : null}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your coaching account" subtitle="Keep setup simple. You can refine targets inside the plan wizard.">
      <input className={inputClass} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input className={inputClass} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className={inputClass} placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <input className={inputClass} placeholder="Phone number (+1...)" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? "Creating..." : "Create account"}
      </Button>
      <div className="text-center">
        <button onClick={() => navigate("/login")} className="text-xs font-medium text-moss hover:underline">
          Already have an account? Log in
        </button>
      </div>
      {mutation.error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}
    </AuthLayout>
  );
}

export function LoginScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState(baseFields);

  const mutation = useMutation({
    mutationFn: () =>
      api<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      }),
    onSuccess: ({ token }) => {
      authStorage.setToken(token);
      navigate("/app/dashboard");
    },
  });

  return (
    <AuthLayout title="Log back in" subtitle="The app is designed for fast daily use on mobile.">
      <input className={inputClass} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className={inputClass} placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? "Logging in..." : "Log in"}
      </Button>
      <div className="text-center">
        <button onClick={() => navigate("/register")} className="text-xs font-medium text-moss hover:underline">
          New here? Create an account
        </button>
      </div>
      {mutation.error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}
    </AuthLayout>
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">SteadyCut</p>
          <h1 className="mt-2 text-2xl font-semibold text-moss">{title}</h1>
          <p className="mt-2 text-sm text-ink/70">{subtitle}</p>
        </div>
        <div className="space-y-3">{children}</div>
      </Card>
    </div>
  );
}

const inputClass =
  "min-h-12 w-full rounded-2xl border border-black/10 bg-canvas px-4 text-sm text-ink outline-none ring-0 placeholder:text-ink/40";
