import { useNavigate } from "react-router-dom";

import { Button } from "../../components/button";
import { Card } from "../../components/card";
import { authStorage } from "../../lib/auth";

export function ProfileScreen() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold text-moss">Settings and guardrails.</h1>
      </div>

      <Card className="space-y-3">
        <p className="text-sm text-ink/70">Phase 1 includes a basic account shell. Later phases can expand reminders, SMS consent, coach tone, and dashboard customization here.</p>
        <Button
          onClick={() => {
            authStorage.clearToken();
            navigate("/login");
          }}
        >
          Log out
        </Button>
      </Card>
    </div>
  );
}
