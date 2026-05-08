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
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 pb-12 pt-12 text-ink">
      <div className="space-y-8">
        <div>
          <div className="inline-flex items-center space-x-2 rounded-full bg-sand px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-clay">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-moss"></span>
            </span>
            <span>Adaptive AI Coaching Live</span>
          </div>
          <h1 className="mt-6 text-5xl font-bold leading-[1.1] tracking-tight text-moss">
            SteadyCut <br />
            <span className="text-clay">Coach</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink/80">
            Real fat-loss rules meets <span className="font-bold text-moss">Adaptive AI</span>. No obsessing, just repeatable wins delivered to your phone.
          </p>
        </div>

        <div className="space-y-6">
          <FeatureItem
            icon="🤖"
            title="Adaptive AI via SMS/WhatsApp"
            description="Our Gemini-powered coach analyzes your daily data and sends personalized check-in feedback directly to your phone."
          />
          <FeatureItem
            icon="⚖️"
            title="Repeatable Rules"
            description="Focus on the essentials: Protein, Fiber, Water, and Steps. Simple adherence for permanent results."
          />
          <FeatureItem
            icon="📊"
            title="Weekly Pattern Reviews"
            description="Automatic weekly classification (Green/Yellow/Red) to spot trends before they become plateaus."
          />
        </div>
      </div>

      <div className="mt-12 space-y-4">
        <Button onClick={() => navigate("/register")} className="h-14 w-full text-lg shadow-xl shadow-moss/10">
          Start Your 4-Month Journey
        </Button>
        <div className="text-center">
          <button onClick={() => navigate("/login")} className="text-sm font-semibold text-clay hover:text-moss hover:underline transition-all">
            Welcome back? Log in here
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex space-x-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand text-xl">{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-moss">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink/60">{description}</p>
      </div>
    </div>
  );
}

export function RegisterScreen() {
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [form, setForm] = useState(baseFields);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [recaptchaWarning, setRecaptchaWarning] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      let recaptchaToken = "";
      setRecaptchaWarning("");
      if (executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha("register");
        } catch {
          setRecaptchaWarning(
            "reCAPTCHA is unavailable right now. Continuing without a browser challenge.",
          );
        }
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
      {recaptchaWarning ? <p className="text-xs text-clay">{recaptchaWarning}</p> : null}
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
        <button onClick={() => navigate("/forgot-password")} className="text-xs font-medium text-clay hover:underline">
          Forgot password?
        </button>
      </div>
      <div className="text-center">
        <button onClick={() => navigate("/register")} className="text-xs font-medium text-moss hover:underline">
          New here? Create an account
        </button>
      </div>
      {mutation.error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}
    </AuthLayout>
  );
}

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const requestMutation = useMutation({
    mutationFn: () =>
      api<{ message: string }>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      setStep("confirm");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      api<{ message: string }>("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword }),
      }),
    onSuccess: () => {
      navigate("/login");
    },
  });

  if (step === "confirm") {
    return (
      <AuthLayout
        title="Enter reset code"
        subtitle="We sent a 6-digit code to the phone number on file, if SMS recovery is enabled for this account."
      >
        <input className={inputClass} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputClass} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
        <input className={inputClass} placeholder="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
          {confirmMutation.isPending ? "Updating..." : "Reset password"}
        </Button>
        <div className="text-center">
          <button onClick={() => setStep("request")} className="text-xs font-medium text-moss hover:underline">
            Start over
          </button>
        </div>
        {confirmMutation.error ? <p className="text-sm text-red-600">{confirmMutation.error.message}</p> : null}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email. If a phone number is on file, we’ll text a one-time code for password reset."
    >
      <input className={inputClass} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending}>
        {requestMutation.isPending ? "Sending..." : "Send SMS code"}
      </Button>
      <div className="text-center">
        <button onClick={() => navigate("/login")} className="text-xs font-medium text-moss hover:underline">
          Back to login
        </button>
      </div>
      {requestMutation.data ? <p className="text-sm text-moss">{requestMutation.data.message}</p> : null}
      {requestMutation.error ? <p className="text-sm text-red-600">{requestMutation.error.message}</p> : null}
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
