import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Search, Sparkles, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const SAMPLE_SYMPTOMS = ["Fever", "Headache", "Sore throat", "Dry cough", "Stomach acid", "Allergy symptoms"];

const DEMO_MATCHES = [
  {
    name: "Panadol 500mg tablets",
    reason: "Common OTC option for fever and mild pain. Check suitability with a pharmacist.",
    image: "/demo/products/pain-relief.svg",
    rx: false,
  },
  {
    name: "Cold care essentials",
    reason: "Products for cough, throat irritation, and nasal symptoms may vary by age and condition.",
    image: "/demo/products/cold-care.svg",
    rx: false,
  },
  {
    name: "Vitamin D3 soft capsules",
    reason: "Supplement paths are best paired with your care profile and therapy history.",
    image: "/demo/products/vitamins.svg",
    rx: false,
  },
];

export function SymptomsTeaserPage() {
  return (
    <div className="space-y-8 animate-section">
      <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Badge variant="info">Public demo</Badge>
          <h1 className="mt-3 flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-950">
            <Stethoscope className="h-7 w-7 text-brand-600" />
            Symptom discovery
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            Explore how PharmaFlow can connect symptoms with pharmacy-ready product options. The
            personalized finder uses your patient profile, allergy history, and therapies after login.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/symptoms/finder">
              <Button>
                Open personalized finder
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline">Browse products</Button>
            </Link>
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-brand-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <Search className="h-4 w-4" />
            Try sample symptoms
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SAMPLE_SYMPTOMS.map((symptom) => (
              <span key={symptom} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover-lift">
                {symptom}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            A signed-in search can save selected symptoms, rank matched products, and explain why a
            product may be relevant.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Demo matches</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">What matching can look like</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {DEMO_MATCHES.map((match) => (
            <article key={match.name} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm hover-lift hover:shadow-md">
              <img src={match.image} alt={match.name} className="aspect-[4/3] w-full object-cover" />
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-600" />
                  <Badge variant={match.rx ? "warning" : "success"}>{match.rx ? "Rx" : "OTC"}</Badge>
                </div>
                <h3 className="font-semibold text-slate-900">{match.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{match.reason}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Symptom discovery is informational and not a diagnosis. Seek urgent medical care for severe,
          persistent, or worsening symptoms.
        </p>
      </div>
    </div>
  );
}
