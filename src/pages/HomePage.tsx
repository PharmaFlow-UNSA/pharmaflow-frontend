import { Link } from "react-router-dom";
import { Pill, Building2, ClipboardList, User } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Role } from "@/types/api";

interface Tile {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TILES: Tile[] = [
  {
    to: "/products",
    title: "Browse products",
    description: "Search the pharmaceutical catalog. Filter by manufacturer, type, or price range.",
    icon: Pill,
  },
  {
    to: "/products",
    title: "Find availability",
    description: "See which pharmacies stock each product so you can pick up locally.",
    icon: Building2,
  },
  {
    to: "/orders",
    title: "My orders",
    description: "Track open orders, completed deliveries, and recent prescriptions.",
    icon: ClipboardList,
  },
  {
    to: "/profile",
    title: "Your profile",
    description: "Review the health profile we have on file, including allergies and active therapies.",
    icon: User,
  },
];

const ROLE_GREETING: Record<Role, string> = {
  ROLE_USER: "Welcome back. Here's everything you can do today.",
  ROLE_DOCTOR: "Welcome, Doctor. Review prescriptions and patient profiles.",
  ROLE_PHARMACIST: "Welcome to the pharmacist console.",
  ROLE_ADMIN: "Welcome, Administrator. You have access to all resources.",
};

export function HomePage() {
  const { user } = useAuth();
  const greeting = user
    ? user.roles.map((r) => ROLE_GREETING[r]).find(Boolean) ?? ROLE_GREETING.ROLE_USER
    : "";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Hello{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="mt-1 text-slate-600">{greeting}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TILES.map((tile) => (
          <Link key={tile.title + tile.to} to={tile.to} className="block">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <span className="rounded-md bg-brand-50 p-2 text-brand-700">
                  <tile.icon className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>{tile.title}</CardTitle>
                  <CardDescription>{tile.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
