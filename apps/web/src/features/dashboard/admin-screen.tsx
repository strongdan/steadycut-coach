import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Card } from "../../components/card";
import { api } from "../../lib/api";
import { authStorage } from "../../lib/auth";

type AdminMessagesData = {
  messagingDriver: string;
  twilioConfigured: boolean;
  metaConfigured: boolean;
  messages: Array<{
    id: string;
    direction: string;
    fromNumber: string;
    toNumber: string;
    body: string;
    status: string;
    createdAt: string;
    user?: {
      name: string;
      email: string;
    };
  }>;
};

export function AdminScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: () =>
      api<AdminMessagesData>("/admin/messages", {
        token: authStorage.getToken(),
      }),
  });

  if (isLoading) return <div className="p-6 text-center text-ink/60">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-600">Error loading admin data</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">System Status</p>
        <h1 className="mt-2 text-3xl font-semibold text-moss">Admin Observability</h1>
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-moss">Messaging Provider Status</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-black/5 pb-2">
            <span className="text-ink/60">Active Driver</span>
            <span className="font-medium capitalize text-moss">{data.messagingDriver}</span>
          </div>
          <div className="flex justify-between border-b border-black/5 pb-2">
            <span className="text-ink/60">Twilio Secrets</span>
            <span className={data.twilioConfigured ? "text-moss" : "text-clay"}>
              {data.twilioConfigured ? "Configured" : "Missing"}
            </span>
          </div>
          <div className="flex justify-between border-b border-black/5 pb-2">
            <span className="text-ink/60">Meta Secrets</span>
            <span className={data.metaConfigured ? "text-moss" : "text-clay"}>
              {data.metaConfigured ? "Configured" : "Missing"}
            </span>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-moss">Recent Messages ({data.messages.length})</h2>
        {data.messages.length === 0 ? (
          <p className="text-sm text-ink/60">No messages sent yet.</p>
        ) : (
          data.messages.map((msg) => (
            <Card key={msg.id} className="space-y-2 text-sm">
              <div className="flex justify-between text-xs text-ink/50">
                <span>{format(new Date(msg.createdAt), "MMM d, h:mm a")}</span>
                <span className="uppercase">{msg.status || "sent"}</span>
              </div>
              <p className="text-ink">{msg.body}</p>
              <div className="flex justify-between text-xs text-ink/50 pt-2 border-t border-black/5">
                <span>To: {msg.toNumber}</span>
                <span>User: {msg.user?.name || "System"}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
