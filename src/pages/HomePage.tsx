import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  HeartPulse,
  HelpCircle,
  MapPin,
  MessageCircle,
  Pill,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { getFaqEntries } from "@/api/faqs";
import { getProductInventorySummary } from "@/api/pharmacies";
import { getCategories, getProductById, getProducts } from "@/api/products";
import { getRecommendations } from "@/api/recommendations";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/Badge";
import {
  formatPrice,
  getProductImage,
  productTypeLabel,
} from "@/lib/catalog";
import type {
  CategoryDTO,
  FaqEntryDTO,
  InventorySummaryDTO,
  ProductDTO,
} from "@/types/api";

export function HomePage() {
  const { user } = useAuth();
  const showCustomerRecommendations =
    Boolean(user) &&
    !user?.roles.some((role) =>
      ["ROLE_ADMIN", "ROLE_DOCTOR", "ROLE_PHARMACIST"].includes(role)
    );

  const products = useQuery({
    queryKey: ["products", "landing"],
    queryFn: () => getProducts({ page: 0, size: 4, sort: "name,asc" }),
  });

  const categories = useQuery({
    queryKey: ["categories", "landing"],
    queryFn: getCategories,
  });

  const faqs = useQuery({
    queryKey: ["faqs", "landing"],
    queryFn: getFaqEntries,
    staleTime: 60_000,
  });

  const productIds = products.data?.content.map((product) => product.id) ?? [];
  const summaries = useQuery({
    queryKey: ["inventory", "product-summary", productIds],
    queryFn: () => getProductInventorySummary(productIds),
    enabled: productIds.length > 0,
  });

  const summariesByProduct = useMemo(
    () => new Map(summaries.data?.map((summary) => [summary.productId, summary]) ?? []),
    [summaries.data]
  );

  const recommendations = useQuery({
    queryKey: ["recommendations", "home", user?.userId],
    queryFn: () => getRecommendations({ userId: user!.userId }),
    enabled: showCustomerRecommendations && Boolean(user?.userId),
    staleTime: 60_000,
    retry: 1,
  });
  const recommendedProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          (recommendations.data ?? [])
            .filter((recommendation) => recommendation.status === "ACTIVE")
            .map((recommendation) => recommendation.productId)
        )
      ).slice(0, 4),
    [recommendations.data]
  );
  const recommendedProductQueries = useQueries({
    queries: recommendedProductIds.map((productId) => ({
      queryKey: ["product", "recommended-home", productId],
      queryFn: () => getProductById(productId),
      staleTime: 60_000,
      enabled: showCustomerRecommendations,
    })),
  });
  const recommendedProducts = useMemo(
    () => recommendedProductQueries.map((query) => query.data).filter(Boolean) as ProductDTO[],
    [recommendedProductQueries]
  );
  const recommendationProductIdsForInventory =
    recommendedProducts.length > 0 ? recommendedProducts.map((product) => product.id) : [];
  const recommendationSummaries = useQuery({
    queryKey: ["inventory", "recommended-home", recommendationProductIdsForInventory],
    queryFn: () => getProductInventorySummary(recommendationProductIdsForInventory),
    enabled: showCustomerRecommendations && recommendationProductIdsForInventory.length > 0,
  });
  const recommendationSummariesByProduct = useMemo(
    () =>
      new Map(recommendationSummaries.data?.map((summary) => [summary.productId, summary]) ?? []),
    [recommendationSummaries.data]
  );

  const activeFaqs = useMemo(
    () => (faqs.data ?? []).filter((faq) => faq.isActive).slice(0, 5),
    [faqs.data]
  );

  return (
    <div className="space-y-16">
      <HeroSection
        products={products.data?.content ?? []}
        productsLoading={products.isLoading}
        summariesByProduct={summariesByProduct}
      />

      <BenefitStrip />

      {showCustomerRecommendations && (
        <RecommendedProductsSection
          recommendationsLoading={
            recommendations.isLoading ||
            recommendedProductQueries.some((query) => query.isLoading)
          }
          recommendationsError={recommendations.error}
          recommendedProducts={recommendedProducts}
          fallbackProducts={products.data?.content ?? []}
          fallbackLoading={products.isLoading}
          summariesByProduct={
            recommendedProducts.length > 0 ? recommendationSummariesByProduct : summariesByProduct
          }
        />
      )}

      <CategoryDiscoverySection
        categories={categories.data ?? []}
        loading={categories.isLoading}
        error={categories.error}
      />

      <SmartFeaturesSection signedIn={Boolean(user)} />

      <FAQSection faqs={activeFaqs} loading={faqs.isLoading} error={faqs.error} />

      <FinalCTA signedIn={Boolean(user)} />
    </div>
  );
}

function HeroSection({
  products,
  productsLoading,
  summariesByProduct,
}: {
  products: ProductDTO[];
  productsLoading: boolean;
  summariesByProduct: Map<number, InventorySummaryDTO>;
}) {
  const heroProducts = products.slice(0, 2);
  const heroProduct = heroProducts[0];
  const heroSummary = heroProduct ? summariesByProduct.get(heroProduct.id) : undefined;

  return (
    <section className="relative overflow-hidden rounded-[2.25rem] border border-brand-100 bg-[radial-gradient(circle_at_78%_24%,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_35%_85%,rgba(14,165,233,0.16),transparent_26%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_50%,#eaf8ff_100%)] shadow-sm">
      <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-teal-200/35 blur-3xl" />
      <div className="absolute -bottom-16 left-1/2 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative grid items-center gap-10 px-6 py-12 md:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-14 lg:py-16 xl:px-16">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
            Online pharmacy marketplace
          </p>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-ink-800 sm:text-5xl xl:text-6xl">
              Your health essentials, delivered with care
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-700">
              Shop pharmacy products, compare availability, and manage orders from one calm
              storefront.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <PrimaryLink to="/products">
              Browse products
              <ArrowRight className="ml-2 h-4 w-4" />
            </PrimaryLink>
            <SecondaryLink to="/symptoms">Search by symptoms</SecondaryLink>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:mr-0">
          <div className="absolute -right-5 -top-5 h-32 w-32 rounded-[2rem] bg-brand-200/40 rotate-6" />
          <div className="absolute -bottom-6 left-4 h-24 w-24 rounded-full bg-sky-200/60" />
          <div className="relative rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-brand-950/10 backdrop-blur">
            <form action="/products" className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label className="sr-only" htmlFor="homeSearch">
                Search products
              </label>
              <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
                <Search className="h-5 w-5 shrink-0 text-brand-600" />
                <input
                  id="homeSearch"
                  name="name"
                  type="search"
                  maxLength={80}
                  placeholder="Search medicines, vitamins, skincare..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="hidden rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:inline-flex"
                >
                  Search
                </button>
              </div>
            </form>

            {productsLoading && <HeroProductSkeleton />}
            {!productsLoading && heroProduct && (
              <HeroProductCard product={heroProduct} summary={heroSummary} />
            )}
            {!productsLoading && !heroProduct && (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm leading-6 text-slate-600">
                Product previews will appear here when catalog data is available.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitStrip() {
  const benefits = [
    {
      icon: BadgeCheck,
      title: "Clear product details",
      text: "See key product information before you choose.",
    },
    {
      icon: MapPin,
      title: "Local stock checks",
      text: "Check nearby availability before you order.",
    },
    {
      icon: Pill,
      title: "Prescription-aware cart",
      text: "Items that need a prescription stay clearly marked.",
    },
    {
      icon: ShieldCheck,
      title: "Guided checkout",
      text: "Move from cart to order with clear steps.",
    },
    {
      icon: Sparkles,
      title: "Smart product matching",
      text: "Find helpful product matches when you need them.",
    },
  ];

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {benefits.map((benefit) => (
          <BenefitCard key={benefit.title} {...benefit} />
        ))}
      </div>
    </section>
  );
}

function RecommendedProductsSection({
  recommendationsLoading,
  recommendationsError,
  recommendedProducts,
  fallbackProducts,
  fallbackLoading,
  summariesByProduct,
}: {
  recommendationsLoading: boolean;
  recommendationsError: unknown;
  recommendedProducts: ProductDTO[];
  fallbackProducts: ProductDTO[];
  fallbackLoading: boolean;
  summariesByProduct: Map<number, InventorySummaryDTO>;
}) {
  const hasPersonalizedProducts = recommendedProducts.length > 0;
  const productsToShow = hasPersonalizedProducts
    ? recommendedProducts
    : fallbackProducts.slice(0, 4);
  const loading = recommendationsLoading || (!hasPersonalizedProducts && fallbackLoading);

  return (
    <section className="space-y-5 rounded-[2rem] border border-brand-100 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_58%,#eff8ff_100%)] p-6 shadow-sm lg:p-8">
      <SectionHeader
        eyebrow="For your next browse"
        title={hasPersonalizedProducts ? "Recommended for you" : "Products to explore"}
        description={
          hasPersonalizedProducts
            ? "Based on your care activity and saved preferences."
            : "A few useful options from the catalog."
        }
        action={{ to: "/products", label: "Open catalog" }}
      />

      {Boolean(recommendationsError) && !hasPersonalizedProducts && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load recommendations. Showing products to explore.
        </div>
      )}

      {loading && <ProductGridSkeleton count={4} />}

      {!loading && productsToShow.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No products to show yet"
          text="Browse the catalog to see available products."
          action={{ to: "/products", label: "Browse products" }}
        />
      )}

      {!loading && productsToShow.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {productsToShow.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              summary={summariesByProduct.get(product.id)}
              compact
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryDiscoverySection({
  categories,
  loading,
  error,
}: {
  categories: CategoryDTO[];
  loading: boolean;
  error: unknown;
}) {
  return (
    <section className="space-y-5 rounded-[2rem] border border-brand-100 bg-white p-6 shadow-sm lg:p-8">
      <SectionHeader
        eyebrow="Shop by need"
        title="Find your pharmacy essentials faster"
        description="Browse common categories for everyday care."
        action={{ to: "/products", label: "All products" }}
      />

      {Boolean(error) && <ErrorMessage error={error} />}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <TileSkeleton key={index} />
          ))}
        </div>
      )}

      {!loading && categories.length === 0 && !error && (
        <EmptyState
          icon={Pill}
          title="No categories available yet"
          text="Browse all products while categories are being updated."
          action={{ to: "/products", label: "Browse all products" }}
        />
      )}

      {categories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 8).map((category, index) => (
            <CategoryTile key={category.id} category={category} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}

function SmartFeaturesSection({ signedIn }: { signedIn: boolean }) {
  const features = [
    {
      icon: Sparkles,
      title: "Symptom-based matching",
      text: "Search symptoms and review possible product matches.",
      to: "/symptoms",
      cta: "Try symptom finder",
    },
    {
      icon: HeartPulse,
      title: "Personal care hub",
      text: "Track reminders, records, and care activity.",
      to: signedIn ? "/my-care" : "/login",
      cta: signedIn ? "Open My Care" : "Sign in for My Care",
    },
    {
      icon: MessageCircle,
      title: "FAQ assistant",
      text: "Get quick answers to common PharmaFlow questions.",
      to: signedIn ? "/my-care" : "/login",
      cta: signedIn ? "Open assistant" : "Sign in to chat",
    },
  ];

  return (
    <section className="rounded-[1.75rem] bg-slate-900 p-6 text-white shadow-sm lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
        <div>
          <Badge variant="info" className="bg-white/10 text-brand-100">
            Smart features
          </Badge>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight">
            Helpful tools for easier care
          </h2>
          <p className="mt-3 leading-7 text-slate-300">
            Find product matches, manage reminders, and get quick support.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <SmartFeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection({
  faqs,
  loading,
  error,
}: {
  faqs: FaqEntryDTO[];
  loading: boolean;
  error: unknown;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
      <SectionHeader
        eyebrow="Questions"
        title="Frequently asked questions"
        description="Quick answers to common PharmaFlow questions."
      />

      {Boolean(error) && <ErrorMessage error={error} />}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
          ))}
        </div>
      )}

      {!loading && faqs.length === 0 && !error && (
        <EmptyState
          icon={HelpCircle}
          title="No questions available yet"
          text="Check back later for common support answers."
        />
      )}

      {faqs.length > 0 && (
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openId === faq.id || (!openId && index === 0);
            return (
              <article key={faq.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold text-ink-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? -1 : faq.id)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-brand-600 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600">
                    {faq.answer}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FinalCTA({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand-600 to-teal-600 px-6 py-9 text-white shadow-lg shadow-brand-900/10 lg:px-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-50">Ready when you are</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Start with the products you need today</h2>
          <p className="mt-2 max-w-2xl leading-7 text-brand-50">
            Browse the catalog, check availability, or continue into your care dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/products"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
          >
            Browse products
          </Link>
          <Link
            to={signedIn ? "/my-care" : "/symptoms"}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/70 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600"
          >
            {signedIn ? "Open My Care" : "Try symptom finder"}
          </Link>
        </div>
      </div>
    </section>
  );
}

function HeroProductCard({ product, summary }: { product: ProductDTO; summary?: InventorySummaryDTO }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="mt-4 grid grid-cols-[6rem_minmax(0,1fr)] gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-50 p-3">
        <img src={getProductImage(product)} alt={product.name} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Badge variant={product.requiresPrescription ? "warning" : "success"}>
            {product.requiresPrescription ? "Rx" : "OTC"}
          </Badge>
          {product.productType && <Badge variant="outline">{productTypeLabel(product.productType)}</Badge>}
        </div>
        <h3 className="mt-2 line-clamp-1 font-bold text-ink-800">{product.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-extrabold text-brand-700">{formatPrice(product.price)}</span>
          <span className="text-slate-500">
            {summary?.inStock ? `${summary.pharmacyCount} pharmacies` : "Availability check"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroProductSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-[6rem_minmax(0,1fr)] gap-4 rounded-2xl bg-white p-4">
      <div className="h-24 w-24 animate-pulse rounded-xl bg-slate-100" />
      <div className="space-y-3 py-1">
        <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-extrabold text-ink-800">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  );
}

function CategoryTile({ category, index }: { category: CategoryDTO; index: number }) {
  const tones = [
    "from-brand-50 to-white",
    "from-sky-50 to-white",
    "from-emerald-50 to-white",
    "from-cyan-50 to-white",
  ];

  return (
    <Link
      to={`/products?categoryId=${category.id}`}
      className={`group rounded-3xl border border-slate-200 bg-gradient-to-br ${
        tones[index % tones.length]
      } p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-slate-200">
        <CategoryGlyph name={category.name} />
      </div>
      <h3 className="mt-5 text-lg font-extrabold text-ink-800 group-hover:text-brand-700">
        {category.name}
      </h3>
      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">
        {category.description ?? "Explore products in this category."}
      </p>
      <span className="mt-5 inline-flex items-center text-sm font-bold text-brand-700">
        Shop category
        <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function SmartFeatureCard({
  icon: Icon,
  title,
  text,
  to,
  cta,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
  to: string;
  cta: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/10 p-5">
      <Icon className="h-6 w-6 text-brand-100" />
      <h3 className="mt-4 font-extrabold text-white">{title}</h3>
      <p className="mt-2 min-h-24 text-sm leading-6 text-slate-300">{text}</p>
      <Link to={to} className="mt-4 inline-flex items-center text-sm font-bold text-brand-100 hover:text-white">
        {cta}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Link>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-800">{title}</h2>
        {description && <p className="mt-2 leading-7 text-slate-600">{description}</p>}
      </div>
      {action && (
        <Link
          to={action.to}
          className="inline-flex items-center text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline"
        >
          {action.label}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Icon className="mx-auto h-10 w-10 text-slate-400" />
      <p className="mt-4 font-extrabold text-ink-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

function ProductGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-[30rem] animate-pulse rounded-3xl bg-white ring-1 ring-slate-200" />
      ))}
    </div>
  );
}

function TileSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-100" />
      <div className="mt-5 h-5 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

function PrimaryLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-ink-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}

function CategoryGlyph({ name }: { name: string }) {
  const normalized = name.toLowerCase();
  if (normalized.includes("vitamin") || normalized.includes("supplement")) {
    return <Sparkles className="h-6 w-6" />;
  }
  if (normalized.includes("skin") || normalized.includes("care")) {
    return <HeartPulse className="h-6 w-6" />;
  }
  if (normalized.includes("device") || normalized.includes("aid")) {
    return <ShieldCheck className="h-6 w-6" />;
  }
  return <Pill className="h-6 w-6" />;
}
