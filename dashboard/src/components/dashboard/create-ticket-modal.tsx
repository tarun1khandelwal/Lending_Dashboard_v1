"use client";

import { useState, useEffect } from "react";
import { X, Ticket, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TicketItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  assignee: string;
  labels: string;
  createdAt: string;
}

interface CreateTicketProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (ticket: TicketItem) => void;
  defaultTitle: string;
  defaultDescription: string;
  defaultPriority?: string;
}

const PRIORITIES = [
  { value: "P0", label: "P0 - Critical", color: "text-red-600 bg-red-50 border-red-200" },
  { value: "P1", label: "P1 - High", color: "text-orange-600 bg-orange-50 border-orange-200" },
  { value: "P2", label: "P2 - Medium", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { value: "P3", label: "P3 - Low", color: "text-blue-600 bg-blue-50 border-blue-200" },
];

let ticketCounter = 1000;

export function CreateTicketModal({ open, onClose, onSubmit, defaultTitle, defaultDescription, defaultPriority }: CreateTicketProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [priority, setPriority] = useState(defaultPriority || "P1");
  const [assignee, setAssignee] = useState("");
  const [labels, setLabels] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  // Sync with defaults whenever the modal opens with new content
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setDescription(defaultDescription);
      setPriority(defaultPriority || "P1");
    }
  }, [open, defaultTitle, defaultDescription, defaultPriority]);

  if (!open) return null;

  const handleCreate = () => {
    ticketCounter += 1;
    const id = `ML-${ticketCounter}`;
    const ticket: TicketItem = {
      id,
      title,
      description,
      priority,
      assignee: assignee || "Unassigned",
      labels,
      createdAt: new Date().toLocaleString(),
    };
    onSubmit(ticket);
    setCreated(id);
    setTimeout(() => {
      setCreated(null);
      onClose();
      setAssignee("");
      setLabels("");
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 fade-in duration-200">
        {created ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mx-auto mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">Ticket Created!</p>
            <p className="text-xs text-muted-foreground mt-1">Ticket <span className="font-mono font-semibold text-primary">{created}</span> has been created and assigned.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Create Alert / Ticket</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full text-xs border border-border rounded-md px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-1 w-full text-xs border border-border rounded-md px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPriority(p.value)}
                        className={cn(
                          "px-2 py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer",
                          priority === p.value ? p.color : "border-border/60 text-muted-foreground hover:border-border"
                        )}
                      >
                        {p.value}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Assignee</label>
                  <input
                    type="text"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Name or team"
                    className="mt-1 w-full text-xs border border-border rounded-md px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Labels / Tags</label>
                <input
                  type="text"
                  value={labels}
                  onChange={(e) => setLabels(e.target.value)}
                  placeholder="funnel, conversion, lender-x"
                  className="mt-1 w-full text-xs border border-border rounded-md px-3 py-2 bg-card focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/20">
              <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim()}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                  title.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Ticket className="h-3 w-3" />
                Create Ticket
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
