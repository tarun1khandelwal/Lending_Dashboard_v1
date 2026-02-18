"use client";

import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRole, ROLE_META, type UserRole } from "@/lib/role-context";
import {
  MessageSquarePlus,
  User,
  Shield,
  Code2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Eye,
  ThumbsUp,
  Send,
  Rocket,
  AlertTriangle,
  Lightbulb,
  Bug,
  BarChart3,
  Palette,
  Database,
  FileText,
  Plus,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type FeedbackStatus = "submitted" | "under_review" | "acknowledged" | "dev_complete" | "admin_review" | "approved" | "rejected" | "live";
type FeedbackPriority = "critical" | "high" | "medium" | "low";
type FeedbackCategory = "bug" | "enhancement" | "new_view" | "data_issue" | "ux";
interface ReviewNote {
  author: string;
  role: UserRole;
  note: string;
  at: Date;
}

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  page: string;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  submittedBy: { name: string; role: UserRole };
  submittedAt: Date;
  assignedTo?: string;
  reviewNotes: ReviewNote[];
  estimatedEffort?: string;
  adminDecision?: { decision: "approved" | "rejected"; by: string; at: Date; note: string };
}

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUS_FLOW: FeedbackStatus[] = ["submitted", "under_review", "acknowledged", "dev_complete", "admin_review", "approved", "live"];

const statusConfig: Record<FeedbackStatus, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  submitted: { label: "Submitted", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: MessageSquarePlus },
  under_review: { label: "Under Review", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: Eye },
  acknowledged: { label: "Acknowledged", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: ThumbsUp },
  dev_complete: { label: "Dev Complete", color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200", icon: Code2 },
  admin_review: { label: "Admin Review", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: Shield },
  approved: { label: "Approved", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: XCircle },
  live: { label: "Live", color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300", icon: Rocket },
};

const priorityConfig: Record<FeedbackPriority, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  high: { label: "High", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  medium: { label: "Medium", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  low: { label: "Low", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
};

const categoryConfig: Record<FeedbackCategory, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "text-red-600" },
  enhancement: { label: "Enhancement", icon: Lightbulb, color: "text-amber-600" },
  new_view: { label: "New View", icon: BarChart3, color: "text-blue-600" },
  data_issue: { label: "Data Issue", icon: Database, color: "text-violet-600" },
  ux: { label: "UX Improvement", icon: Palette, color: "text-pink-600" },
};

const roleConfig: Record<UserRole, { label: string; fullLabel: string; icon: typeof User; color: string; bg: string; description: string }> = {
  pm: { label: "PM", fullLabel: "Product Manager", icon: User, color: "text-blue-700", bg: "bg-blue-100 border-blue-300", description: "Submit feedback, track status, view updates" },
  analyst: { label: "Analyst/DE", fullLabel: "Analyst / Data Engineer", icon: Code2, color: "text-violet-700", bg: "bg-violet-100 border-violet-300", description: "Review, acknowledge, build changes, push to admin" },
  admin: { label: "Admin", fullLabel: "Admin / Lead", icon: Shield, color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300", description: "Final approval, reject, or push changes live" },
};

// ─── Demo Data ──────────────────────────────────────────────────────────────

const DEMO_FEEDBACK: FeedbackItem[] = [
  {
    id: "FB-001",
    title: "Add DOD conversion trend to Funnel Summary",
    description: "The funnel summary only shows MTD vs LMTD comparison. We need a day-over-day trend line for each stage to detect drops earlier rather than waiting for the full month comparison.",
    page: "Funnel Summary",
    category: "new_view",
    priority: "high",
    status: "live",
    submittedBy: { name: "Tarun K.", role: "pm" },
    submittedAt: new Date("2026-01-15"),
    assignedTo: "Ravi S.",
    estimatedEffort: "3 days",
    reviewNotes: [
      { author: "Ravi S.", role: "analyst", note: "Good ask. I'll build a DOD line chart with drop detection markers. Will use L2 data and generate synthetic daily granularity from MTD snapshots.", at: new Date("2026-01-16") },
      { author: "Ravi S.", role: "analyst", note: "Dev complete. Added line_trend chart type to Data Playground. The funnel page will need a separate card — pushing to admin for scope approval.", at: new Date("2026-01-20") },
      { author: "Priya M.", role: "admin", note: "Approved. This is a key visibility gap. Go live on the Data Playground first, then we'll add a dedicated section in Funnel Summary.", at: new Date("2026-01-22") },
    ],
    adminDecision: { decision: "approved", by: "Priya M.", at: new Date("2026-01-22"), note: "Live in Data Playground. Funnel Summary integration in next sprint." },
  },
  {
    id: "FB-002",
    title: "BRE2 completion rate showing incorrect values for PIRAMAL",
    description: "PIRAMAL's BRE2 completion rate seems inflated at 94%. Cross-checking with raw data shows it should be around 78%. Likely a data mapping issue between sub_stage names.",
    page: "Lender Summary",
    category: "data_issue",
    priority: "critical",
    status: "dev_complete",
    submittedBy: { name: "Ankita R.", role: "pm" },
    submittedAt: new Date("2026-02-01"),
    assignedTo: "Deepak T.",
    estimatedEffort: "1 day",
    reviewNotes: [
      { author: "Deepak T.", role: "analyst", note: "Confirmed. PIRAMAL uses 'BRE_ROUND2' instead of 'BRE2' in their data feed. The mapping was missing this variant. Fixing now.", at: new Date("2026-02-02") },
      { author: "Deepak T.", role: "analyst", note: "Fix deployed. Added 'BRE_ROUND2' → 'BRE2' mapping in the data normalization layer. PIRAMAL now showing 78.3% — matches raw data.", at: new Date("2026-02-04") },
    ],
  },
  {
    id: "FB-003",
    title: "Alert cards should be clickable to filter the list",
    description: "In Alert Tracking, the severity summary cards (Critical, High, etc.) should act as filters. Clicking 'Critical' should filter the alert list below to show only critical alerts.",
    page: "Alert Tracking",
    category: "ux",
    priority: "medium",
    status: "live",
    submittedBy: { name: "Tarun K.", role: "pm" },
    submittedAt: new Date("2026-01-28"),
    assignedTo: "Ravi S.",
    estimatedEffort: "0.5 days",
    reviewNotes: [
      { author: "Ravi S.", role: "analyst", note: "Quick fix. Adding onClick handlers and active-state styling to the summary cards.", at: new Date("2026-01-28") },
      { author: "Ravi S.", role: "analyst", note: "Done. Cards now toggle filter on click with ring-2 highlight. Also added 'Click to filter/clear' hint text.", at: new Date("2026-01-29") },
      { author: "Priya M.", role: "admin", note: "Approved — clean UX improvement. Ship it.", at: new Date("2026-01-29") },
    ],
    adminDecision: { decision: "approved", by: "Priya M.", at: new Date("2026-01-29"), note: "Shipped same day." },
  },
  {
    id: "FB-004",
    title: "Add lender-wise AOP pacing to Executive Summary",
    description: "The executive summary shows overall AOP pacing but doesn't break it down by lender. We need a quick view of which lenders are on track and which are behind.",
    page: "Executive Summary",
    category: "enhancement",
    priority: "high",
    status: "admin_review",
    submittedBy: { name: "Vikram P.", role: "pm" },
    submittedAt: new Date("2026-02-03"),
    assignedTo: "Ravi S.",
    estimatedEffort: "2 days",
    reviewNotes: [
      { author: "Ravi S.", role: "analyst", note: "Acknowledged. Will add a lender breakdown table with AOP pacing bars and At Risk/On Track badges. Data is already available in the breakdown computation.", at: new Date("2026-02-04") },
      { author: "Ravi S.", role: "analyst", note: "Dev complete. Added a 'Lender AOP Pacing' card below the existing KPI section. Shows progress bars, projected vs target, and status badges. Pushing to admin.", at: new Date("2026-02-07") },
    ],
  },
  {
    id: "FB-005",
    title: "Disbursal Summary heatmap colors are hard to read",
    description: "The Lender × Program matrix in Disbursal Summary uses green/red shading that's hard to distinguish for the 'Moderate' values. Need better color gradient.",
    page: "Disbursal Summary",
    category: "ux",
    priority: "low",
    status: "acknowledged",
    submittedBy: { name: "Neha G.", role: "analyst" },
    submittedAt: new Date("2026-02-05"),
    assignedTo: "Ravi S.",
    estimatedEffort: "0.5 days",
    reviewNotes: [
      { author: "Ravi S.", role: "analyst", note: "Valid point. Will switch from red/green to a blue/orange diverging palette that's more accessible. Picking up next.", at: new Date("2026-02-06") },
    ],
  },
  {
    id: "FB-006",
    title: "RCA page needs real data integration — currently simulated",
    description: "The RCA & Fix Tracking page generates synthetic RCA items from conversion data. We need to integrate with the actual JIRA/issue tracker to pull real RCA tickets, owners, and timelines.",
    page: "RCA & Fix Tracking",
    category: "enhancement",
    priority: "high",
    status: "under_review",
    submittedBy: { name: "Tarun K.", role: "pm" },
    submittedAt: new Date("2026-02-08"),
    reviewNotes: [
      { author: "Deepak T.", role: "analyst", note: "Reviewing. We'll need JIRA API access and a mapping layer to connect ticket IDs to funnel stages. Scoping the effort now.", at: new Date("2026-02-09") },
    ],
  },
  {
    id: "FB-007",
    title: "Data Playground should support date range filters in prompts",
    description: "When I ask 'show me trend for last 7 days', the playground doesn't actually filter to 7 days — it always shows 30. Need to parse date ranges from natural language prompts.",
    page: "Data Playground",
    category: "enhancement",
    priority: "medium",
    status: "submitted",
    submittedBy: { name: "Ankita R.", role: "pm" },
    submittedAt: new Date("2026-02-10"),
    reviewNotes: [],
  },
  {
    id: "FB-008",
    title: "Export dashboard views as PDF for stakeholder reporting",
    description: "Stakeholders in leadership want to receive weekly PDF reports of key dashboard views. Need an export button that captures the current state of any page as a formatted PDF.",
    page: "All Pages",
    category: "new_view",
    priority: "medium",
    status: "rejected",
    submittedBy: { name: "Vikram P.", role: "pm" },
    submittedAt: new Date("2026-01-20"),
    reviewNotes: [
      { author: "Ravi S.", role: "analyst", note: "Acknowledged but this is complex. Browser-based PDF rendering has quality/layout issues. Recommending scheduled email reports via backend service instead.", at: new Date("2026-01-21") },
      { author: "Ravi S.", role: "analyst", note: "Built a lightweight screenshot-to-PDF using html2canvas. Works for most views but charts render slightly fuzzy. Pushing to admin for decision.", at: new Date("2026-01-25") },
    ],
    adminDecision: { decision: "rejected", by: "Priya M.", at: new Date("2026-01-26"), note: "Deferred. Quality isn't good enough for leadership. Will revisit with backend email service in Q2." },
  },
  {
    id: "FB-009",
    title: "Show program_type in Alert Tracking attribution tables",
    description: "The By Lender and By Stage tables in Alert Tracking don't show which programs are affected. Need a 'Programs Affected' column with badge chips.",
    page: "Alert Tracking",
    category: "enhancement",
    priority: "medium",
    status: "live",
    submittedBy: { name: "Tarun K.", role: "pm" },
    submittedAt: new Date("2026-02-02"),
    assignedTo: "Ravi S.",
    estimatedEffort: "0.5 days",
    reviewNotes: [
      { author: "Ravi S.", role: "analyst", note: "Simple addition. Aggregating program_type from alert data and rendering as Badge chips. Also adding a combined Program × Stage table.", at: new Date("2026-02-02") },
      { author: "Ravi S.", role: "analyst", note: "Done. Added 'Programs Affected' column to both tables + new 'By Program × Stage' combined view.", at: new Date("2026-02-03") },
      { author: "Priya M.", role: "admin", note: "Good addition, approved.", at: new Date("2026-02-03") },
    ],
    adminDecision: { decision: "approved", by: "Priya M.", at: new Date("2026-02-03"), note: "Deployed." },
  },
  {
    id: "FB-010",
    title: "Insights Summary should auto-refresh every 4 hours",
    description: "The Insights & Briefing page currently loads static data on page visit. For it to be a true daily briefing, it should auto-refresh its data every 4 hours and show 'last updated' timestamp.",
    page: "Insights Summary",
    category: "enhancement",
    priority: "low",
    status: "submitted",
    submittedBy: { name: "Neha G.", role: "analyst" },
    submittedAt: new Date("2026-02-11"),
    reviewNotes: [],
  },
];

// ─── Submission Form Modal ──────────────────────────────────────────────────

function SubmitFeedbackModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (item: FeedbackItem) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [page, setPage] = useState("Funnel Summary");
  const [category, setCategory] = useState<FeedbackCategory>("enhancement");
  const [priority, setPriority] = useState<FeedbackPriority>("medium");

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;
    const item: FeedbackItem = {
      id: `FB-${Date.now().toString().slice(-3)}`,
      title: title.trim(),
      description: description.trim(),
      page,
      category,
      priority,
      status: "submitted",
      submittedBy: { name: "You", role: "pm" },
      submittedAt: new Date(),
      reviewNotes: [],
    };
    onSubmit(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-blue-600" />
            Submit Feedback
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief summary of your feedback" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of what you need or what's wrong..." rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Page</label>
              <Select value={page} onValueChange={setPage}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Executive Summary", "Funnel Summary", "Lender Summary", "Disbursal Summary", "Alert Tracking", "RCA & Fix Tracking", "Data Playground", "Insights Summary", "All Pages"].map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as FeedbackPriority)}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-muted/20 rounded-b-xl">
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs h-8" onClick={handleSubmit} disabled={!title.trim() || !description.trim()}>
            <Send className="h-3 w-3 mr-1.5" /> Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { activeRole, currentUser } = useRole();
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>(DEMO_FEEDBACK);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // ─── Pipeline counts ──────────────────────────────────────────────────
  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_FLOW.forEach((s) => { counts[s] = 0; });
    counts["rejected"] = 0;
    feedbackItems.forEach((f) => { counts[f.status] = (counts[f.status] || 0) + 1; });
    return counts;
  }, [feedbackItems]);

  // ─── Filtered items ───────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let items = feedbackItems;
    if (statusFilter !== "all") items = items.filter((f) => f.status === statusFilter);
    return items.sort((a, b) => {
      const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return pOrder[a.priority] - pOrder[b.priority] || b.submittedAt.getTime() - a.submittedAt.getTime();
    });
  }, [feedbackItems, statusFilter]);

  // ─── Summary stats ────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: feedbackItems.length,
    open: feedbackItems.filter((f) => !["approved", "rejected", "live"].includes(f.status)).length,
    live: feedbackItems.filter((f) => f.status === "live").length,
    rejected: feedbackItems.filter((f) => f.status === "rejected").length,
    avgAge: Math.round(feedbackItems.reduce((s, f) => s + (Date.now() - f.submittedAt.getTime()) / 86400000, 0) / feedbackItems.length),
    byCategory: Object.fromEntries(
      Object.keys(categoryConfig).map((k) => [k, feedbackItems.filter((f) => f.category === k).length])
    ),
  }), [feedbackItems]);

  // ─── Role-based actions ───────────────────────────────────────────────
  const advanceStatus = useCallback((id: string, newStatus: FeedbackStatus, note: string) => {
    setFeedbackItems((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const updated = { ...f, status: newStatus, reviewNotes: [...f.reviewNotes, {
        author: activeRole === "pm" ? "You (PM)" : activeRole === "analyst" ? "You (Analyst)" : "You (Admin)",
        role: activeRole,
        note,
        at: new Date(),
      }] };
      if (newStatus === "approved" || newStatus === "rejected") {
        updated.adminDecision = {
          decision: newStatus as "approved" | "rejected",
          by: "You (Admin)",
          at: new Date(),
          note,
        };
      }
      if (newStatus === "under_review" || newStatus === "acknowledged") {
        updated.assignedTo = updated.assignedTo || "You";
      }
      return updated;
    }));
  }, [activeRole]);

  const handleNewFeedback = useCallback((item: FeedbackItem) => {
    setFeedbackItems((prev) => [item, ...prev]);
  }, []);

  const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

  return (
    <div>
      <PageHeader title="Feedback & Changes" description="Submit feedback, track changes through review → build → approval pipeline">
        <Button size="sm" className="text-xs h-8" onClick={() => setShowSubmitModal(true)}>
          <Plus className="h-3 w-3 mr-1.5" /> Submit Feedback
        </Button>
      </PageHeader>

      {showSubmitModal && <SubmitFeedbackModal onClose={() => setShowSubmitModal(false)} onSubmit={handleNewFeedback} />}

      <div className="p-6 space-y-6">

        {/* ─── Active Role Banner ─────────────────────────────────────── */}
        <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-lg border", ROLE_META[activeRole].bg, "border-current/10")}>
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0", ROLE_META[activeRole].avatarBg)}>
            {currentUser.avatar}
          </div>
          <div className="flex-1">
            <p className="text-xs">
              Viewing as <strong className={ROLE_META[activeRole].color}>{currentUser.name} ({ROLE_META[activeRole].fullLabel})</strong>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {activeRole === "pm" ? "You can submit feedback and track status" : activeRole === "analyst" ? "You can review, acknowledge, build and push changes" : "You can approve, reject, and ship changes"}
              {" · "}Switch roles from the profile menu in the top bar ↗
            </p>
          </div>
        </div>

        {/* ─── Pipeline Visualization ────────────────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Feedback Pipeline</p>
            <div className="flex items-center gap-0 overflow-x-auto">
              {STATUS_FLOW.map((status, i) => {
                const cfg = statusConfig[status];
                const count = pipelineCounts[status] || 0;
                const isActive = statusFilter === status;
                const Icon = cfg.icon;
                return (
                  <div key={status} className="flex items-center">
                    <button
                      onClick={() => setStatusFilter(isActive ? "all" : status)}
                      className={cn(
                        "flex flex-col items-center px-4 py-2.5 rounded-lg border transition-all min-w-[90px]",
                        isActive ? `${cfg.bg} ${cfg.border} shadow-sm ring-2 ring-offset-1` : "bg-card border-border hover:bg-muted/30",
                        isActive && status === "submitted" && "ring-blue-300",
                        isActive && status === "under_review" && "ring-amber-300",
                        isActive && status === "acknowledged" && "ring-violet-300",
                        isActive && status === "dev_complete" && "ring-cyan-300",
                        isActive && status === "admin_review" && "ring-orange-300",
                        isActive && (status === "approved" || status === "live") && "ring-emerald-300",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 mb-1", cfg.color)} />
                      <span className={cn("text-lg font-bold tabular-nums", cfg.color)}>{count}</span>
                      <span className="text-[8px] text-muted-foreground font-medium mt-0.5">{cfg.label}</span>
                    </button>
                    {i < STATUS_FLOW.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 mx-1 shrink-0" />
                    )}
                  </div>
                );
              })}
              {/* Rejected bucket */}
              <div className="ml-4 pl-4 border-l border-border">
                <button
                  onClick={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
                  className={cn(
                    "flex flex-col items-center px-4 py-2.5 rounded-lg border transition-all min-w-[90px]",
                    statusFilter === "rejected" ? "bg-red-50 border-red-200 shadow-sm ring-2 ring-red-300 ring-offset-1" : "bg-card border-border hover:bg-muted/30"
                  )}
                >
                  <XCircle className={cn("h-4 w-4 mb-1", "text-red-600")} />
                  <span className="text-lg font-bold tabular-nums text-red-600">{pipelineCounts["rejected"] || 0}</span>
                  <span className="text-[8px] text-muted-foreground font-medium mt-0.5">Rejected</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Summary Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-3 text-center">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Total Items</p>
            <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Open / In Progress</p>
            <p className="text-2xl font-bold tabular-nums text-amber-600">{stats.open}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Shipped (Live)</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">{stats.live}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Rejected / Deferred</p>
            <p className="text-2xl font-bold tabular-nums text-red-600">{stats.rejected}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase">Avg Age (days)</p>
            <p className="text-2xl font-bold tabular-nums">{stats.avgAge}</p>
          </CardContent></Card>
        </div>

        <Separator />

        {/* ─── Feedback Items ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {statusFilter === "all" ? "All Feedback Items" : `${statusConfig[statusFilter]?.label || statusFilter} Items`}
              <Badge variant="outline" className="text-[9px] ml-1">{filteredItems.length}</Badge>
            </h2>
            {statusFilter !== "all" && (
              <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => setStatusFilter("all")}>
                Clear filter <X className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {filteredItems.map((item) => {
              const sCfg = statusConfig[item.status];
              const pCfg = priorityConfig[item.priority];
              const cCfg = categoryConfig[item.category];
              const CatIcon = cCfg.icon;
              const isExpanded = expandedId === item.id;

              // Determine available actions based on role + status
              const actions: { label: string; targetStatus: FeedbackStatus; note: string; variant?: "default" | "destructive" }[] = [];
              if (activeRole === "analyst") {
                if (item.status === "submitted") actions.push({ label: "Pick Up for Review", targetStatus: "under_review", note: "Picked up for review by analyst." });
                if (item.status === "under_review") actions.push({ label: "Acknowledge & Start Work", targetStatus: "acknowledged", note: "Acknowledged. Starting implementation." });
                if (item.status === "acknowledged") actions.push({ label: "Mark Dev Complete", targetStatus: "dev_complete", note: "Development complete. Ready for admin review." });
                if (item.status === "dev_complete") actions.push({ label: "Push to Admin", targetStatus: "admin_review", note: "Pushed to admin for final approval." });
              }
              if (activeRole === "admin") {
                if (item.status === "admin_review") {
                  actions.push({ label: "Approve & Ship", targetStatus: "approved", note: "Approved. Ship to production." });
                  actions.push({ label: "Reject / Defer", targetStatus: "rejected", note: "Rejected or deferred to next cycle.", variant: "destructive" });
                }
                if (item.status === "approved") actions.push({ label: "Mark as Live", targetStatus: "live", note: "Deployed to production. Now live." });
              }

              return (
                <Card key={item.id} className={cn("transition-all", isExpanded && "shadow-md")}>
                  <CardContent className="p-0">
                    {/* Header row */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground">{item.id}</span>
                          <Badge variant="outline" className={cn("text-[8px] px-1.5", pCfg.bg, pCfg.color)}>{pCfg.label}</Badge>
                          <Badge variant="outline" className={cn("text-[8px] px-1.5", sCfg.bg, sCfg.border, sCfg.color)}>{sCfg.label}</Badge>
                          <Badge variant="outline" className="text-[8px] px-1.5 gap-1">
                            <CatIcon className={cn("h-2.5 w-2.5", cCfg.color)} />
                            {cCfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold mt-1 truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.page} · by {item.submittedBy.name} ({roleConfig[item.submittedBy.role].label}) · {formatDate(item.submittedAt)}</p>
                      </div>
                      {item.assignedTo && (
                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-muted-foreground">Assigned to</p>
                          <p className="text-[10px] font-semibold">{item.assignedTo}</p>
                        </div>
                      )}
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border/50">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
                          {/* Description + Meta */}
                          <div className="lg:col-span-2 space-y-3">
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                              <p className="text-xs text-foreground leading-relaxed">{item.description}</p>
                            </div>

                            {item.estimatedEffort && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">Estimated effort: <strong className="text-foreground">{item.estimatedEffort}</strong></span>
                              </div>
                            )}

                            {/* Status progress */}
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Progress</p>
                              <div className="flex items-center gap-1">
                                {STATUS_FLOW.map((s, i) => {
                                  const reached = STATUS_FLOW.indexOf(item.status) >= i || item.status === "live" || (item.status === "rejected" && i <= STATUS_FLOW.indexOf("admin_review"));
                                  const isCurrent = item.status === s;
                                  const sC = statusConfig[s];
                                  return (
                                    <div key={s} className="flex items-center">
                                      <div className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold transition-all",
                                        isCurrent ? `${sC.bg} ${sC.color} ring-2 ring-offset-1 ${sC.border}` :
                                        reached ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                                      )}>
                                        {reached && !isCurrent ? <CheckCircle2 className="h-3 w-3" /> : (i + 1)}
                                      </div>
                                      {i < STATUS_FLOW.length - 1 && (
                                        <div className={cn("w-4 h-0.5 mx-0.5", reached ? "bg-emerald-300" : "bg-muted")} />
                                      )}
                                    </div>
                                  );
                                })}
                                {item.status === "rejected" && (
                                  <div className="ml-2 flex items-center gap-1">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-[9px] text-red-600 font-semibold">Rejected</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-0.5 mt-1">
                                {STATUS_FLOW.map((s) => (
                                  <span key={s} className="text-[7px] text-muted-foreground w-7 text-center">{statusConfig[s].label.split(" ")[0]}</span>
                                ))}
                              </div>
                            </div>

                            {/* Actions */}
                            {actions.length > 0 && (
                              <div className="flex items-center gap-2 pt-1">
                                {actions.map((action, i) => (
                                  <Button
                                    key={i}
                                    variant={action.variant === "destructive" ? "destructive" : "default"}
                                    size="sm"
                                    className="text-[10px] h-7"
                                    onClick={() => advanceStatus(item.id, action.targetStatus, action.note)}
                                  >
                                    <ArrowRight className="h-3 w-3 mr-1" />
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                            {actions.length === 0 && (
                              <p className="text-[10px] text-muted-foreground italic">
                                {activeRole === "pm" ? "Waiting for Analyst/DE to pick up" :
                                 activeRole === "analyst" && ["admin_review", "approved", "live", "rejected"].includes(item.status) ? "This item is with Admin now" :
                                 activeRole === "admin" && !["admin_review", "approved"].includes(item.status) ? "This item hasn't reached Admin review yet" :
                                 "No actions available for this status"}
                              </p>
                            )}
                          </div>

                          {/* Review Notes Timeline */}
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activity Timeline</p>
                            <div className="space-y-0">
                              {/* Initial submission */}
                              <div className="flex gap-2 pb-3">
                                <div className="flex flex-col items-center">
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
                                    <MessageSquarePlus className="h-2.5 w-2.5 text-blue-600" />
                                  </div>
                                  {item.reviewNotes.length > 0 && <div className="w-px flex-1 bg-border mt-1" />}
                                </div>
                                <div className="pb-1">
                                  <p className="text-[10px] font-semibold">{item.submittedBy.name} <Badge variant="outline" className="text-[7px] px-1 ml-1">{roleConfig[item.submittedBy.role].label}</Badge></p>
                                  <p className="text-[9px] text-muted-foreground">Submitted · {formatDate(item.submittedAt)}</p>
                                </div>
                              </div>

                              {item.reviewNotes.map((note, i) => (
                                <div key={i} className="flex gap-2 pb-3">
                                  <div className="flex flex-col items-center">
                                    <div className={cn("flex h-5 w-5 items-center justify-center rounded-full",
                                      note.role === "admin" ? "bg-emerald-100" : "bg-violet-100"
                                    )}>
                                      {note.role === "admin"
                                        ? <Shield className="h-2.5 w-2.5 text-emerald-600" />
                                        : <Code2 className="h-2.5 w-2.5 text-violet-600" />
                                      }
                                    </div>
                                    {i < item.reviewNotes.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                                  </div>
                                  <div className="pb-1 min-w-0">
                                    <p className="text-[10px] font-semibold">{note.author} <Badge variant="outline" className="text-[7px] px-1 ml-1">{roleConfig[note.role].label}</Badge></p>
                                    <p className="text-[10px] text-foreground leading-relaxed mt-0.5">{note.note}</p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5">{formatDate(note.at)}</p>
                                  </div>
                                </div>
                              ))}

                              {/* Admin decision */}
                              {item.adminDecision && (
                                <div className="flex gap-2 pb-1">
                                  <div className="flex flex-col items-center">
                                    <div className={cn("flex h-5 w-5 items-center justify-center rounded-full",
                                      item.adminDecision.decision === "approved" ? "bg-emerald-100" : "bg-red-100"
                                    )}>
                                      {item.adminDecision.decision === "approved"
                                        ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                                        : <XCircle className="h-2.5 w-2.5 text-red-600" />
                                      }
                                    </div>
                                  </div>
                                  <div>
                                    <p className={cn("text-[10px] font-bold", item.adminDecision.decision === "approved" ? "text-emerald-700" : "text-red-700")}>
                                      {item.adminDecision.decision === "approved" ? "APPROVED" : "REJECTED"} by {item.adminDecision.by}
                                    </p>
                                    <p className="text-[10px] text-foreground leading-relaxed mt-0.5">{item.adminDecision.note}</p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5">{formatDate(item.adminDecision.at)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* ─── Category Breakdown ────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Feedback by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.entries(categoryConfig) as [FeedbackCategory, typeof categoryConfig[FeedbackCategory]][]).map(([key, cfg]) => {
              const count = stats.byCategory[key] || 0;
              const Icon = cfg.icon;
              return (
                <Card key={key} className="hover:shadow-sm transition-all">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0")}>
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">{count}</p>
                      <p className="text-[9px] text-muted-foreground">{cfg.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ─── How It Works (for demo context) ───────────────────────── */}
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How the Feedback Pipeline Works</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <User className="h-3 w-3 text-blue-600" />
                  </div>
                  <p className="text-xs font-semibold text-blue-700">PM / User</p>
                </div>
                <ul className="text-[10px] text-muted-foreground space-y-1 ml-8">
                  <li>• Submits feedback on any dashboard view</li>
                  <li>• Sets priority and category</li>
                  <li>• Tracks status through the pipeline</li>
                  <li>• Can see all activity & decisions</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100">
                    <Code2 className="h-3 w-3 text-violet-600" />
                  </div>
                  <p className="text-xs font-semibold text-violet-700">Analyst / DE</p>
                </div>
                <ul className="text-[10px] text-muted-foreground space-y-1 ml-8">
                  <li>• Reviews incoming feedback</li>
                  <li>• Acknowledges feasibility & estimates effort</li>
                  <li>• Builds the change</li>
                  <li>• Pushes to Admin for approval</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                    <Shield className="h-3 w-3 text-emerald-600" />
                  </div>
                  <p className="text-xs font-semibold text-emerald-700">Admin / Lead</p>
                </div>
                <ul className="text-[10px] text-muted-foreground space-y-1 ml-8">
                  <li>• Reviews completed changes</li>
                  <li>• Approves or rejects with reasoning</li>
                  <li>• Marks approved items as Live</li>
                  <li>• Full oversight of the pipeline</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
