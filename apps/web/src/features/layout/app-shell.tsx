import { Link, NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-8 pt-6 text-ink">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/app/dashboard" className="text-lg font-semibold tracking-tight text-moss">
          SteadyCut
        </Link>
        <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-clay">
          Not medical advice
        </span>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="mt-6 grid grid-cols-5 gap-2 rounded-[24px] bg-white/90 p-2 shadow-card">
        {[
          ["/app/dashboard", "Today"],
          ["/app/check-in", "Check-In"],
          ["/app/plan", "Plan"],
          ["/app/settings", "Settings"],
          ["/app/profile", "Profile"],
        ].map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `rounded-2xl px-3 py-2 text-center text-xs font-semibold ${
                isActive ? "bg-moss text-white" : "text-ink/70"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
