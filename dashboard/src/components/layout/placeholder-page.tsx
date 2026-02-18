"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  plannedFeatures: string[];
}

export function PlaceholderPage({
  title,
  description,
  plannedFeatures,
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="p-6">
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="flex flex-col items-center text-center py-12 px-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
              <Construction className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This view is under development. Planned features:
            </p>
            <ul className="text-sm text-left space-y-2 w-full">
              {plannedFeatures.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
