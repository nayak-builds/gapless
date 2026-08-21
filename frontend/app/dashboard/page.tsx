import { Card } from "@/components/ui/Card";

export default function DashboardPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="font-serif text-3xl text-navy">Dashboard</h1>
      <Card className="mt-8">
        <p className="text-ink-muted">Your gap analysis will appear here.</p>
      </Card>
    </section>
  );
}
