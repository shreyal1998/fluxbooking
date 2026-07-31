"use client";

import { useState } from "react";
import { Check, CreditCard, AlertCircle, Calendar } from "lucide-react";
import { PLANS } from "@/config/plans";
import { createLemonSqueezyCheckout, cancelLemonSqueezySubscription } from "@/app/actions/lemonsqueezy";

export function BillingSettings({ 
  currentPlan, 
  planInterval,
  planStatus,
  subscriptionId,
  subscriptionEndsAt,
  trialEndsAt
}: { 
  currentPlan: string, 
  planInterval: string,
  planStatus?: string | null,
  subscriptionId?: string | null,
  subscriptionEndsAt?: Date | string | null,
  trialEndsAt?: Date | string | null
}) {
  const [interval, setInterval] = useState<"MONTH" | "YEAR">(planInterval as any || "MONTH");
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const isTrialActive = planStatus === "TRIALING" && trialEndsAt && new Date(trialEndsAt) > new Date();

  const handleCancelSubscription = async () => {
    if (!subscriptionId) return;
    const confirmed = window.confirm("Are you sure you want to cancel your active subscription? You will still retain access to your plan until the end of your billing cycle.");
    if (!confirmed) return;

    setCancelling(true);
    try {
      const result = await cancelLemonSqueezySubscription(subscriptionId);
      if (result.success) {
        alert("Subscription cancelled successfully. Your plan will not renew at the end of the billing period.");
        window.location.reload();
      } else {
        alert(result.error || "Failed to cancel subscription");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while cancelling your subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) {
       alert("Plan not found");
       setLoading(null);
       return;
    }

    const variantId = interval === "YEAR" ? plan.price.yearlyVariantId : plan.price.monthlyVariantId;

    if (!variantId) {
      alert("Plan configuration error: Variant ID missing for this interval");
      setLoading(null);
      return;
    }

    const result = await createLemonSqueezyCheckout(variantId);

    if (result.url) {
      window.location.href = result.url;
    } else if (result.error) {
      alert(result.error);
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Subscription Details */}
      {currentPlan !== "FREE" && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shrink-0 ${
              planStatus === "CANCELLED" 
                ? "bg-amber-500 shadow-lg shadow-amber-500/10" 
                : "bg-indigo-600 shadow-lg shadow-indigo-600/10"
            }`}>
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Active Plan: <span className="text-indigo-600 dark:text-indigo-400 capitalize">{currentPlan.toLowerCase()}</span>
                {planStatus === "CANCELLED" && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Cancelled
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {planStatus === "CANCELLED" ? (
                  <span>Access ends on <strong>{subscriptionEndsAt ? new Date(subscriptionEndsAt).toLocaleDateString() : ""}</strong></span>
                ) : (
                  <span>Renews on <strong>{subscriptionEndsAt ? new Date(subscriptionEndsAt).toLocaleDateString() : "Next billing date"}</strong></span>
                )}
              </p>
            </div>
          </div>

          {planStatus !== "CANCELLED" && subscriptionId && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="px-6 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 shrink-0 border border-rose-100 dark:border-rose-900/30"
            >
              {cancelling ? "Cancelling..." : "Cancel Subscription"}
            </button>
          )}
        </div>
      )}

      {/* Subscription Plans */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">Subscription Plans</h3>
          </div>
          
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setInterval("MONTH")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                interval === "MONTH" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                  : "text-black dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setInterval("YEAR")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                interval === "YEAR" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none" 
                  : "text-black dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              Yearly <span className={`ml-1 text-[10px] ${interval === "YEAR" ? "text-indigo-100" : "text-indigo-600 dark:text-indigo-400"}`}>(-20%)</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const monthlyPrice = plan.price.amount;
              // Landing page uses "Pay for 10 months" logic for yearly
              const yearlyTotal = (monthlyPrice * 10).toFixed(2);
              const yearlyMonthlyAverage = ((monthlyPrice * 10) / 12).toFixed(2);

              return (
                <div 
                  key={plan.id}
                  className={`relative p-6 rounded-2xl border transition-all shadow-sm ${
                    isCurrent 
                    ? "border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-600 dark:ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10" 
                    : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-indigo-500/30"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">
                      Current Plan
                    </span>
                  )}
                  
                  <div className="mb-4">
                    <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">{plan.name}</h4>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {plan.price.amount === 0 ? '$0' : (interval === "YEAR" ? `$${yearlyTotal}` : `$${monthlyPrice}`)}
                      </span>
                      <span className="text-slate-400 text-sm font-medium">/{interval === "YEAR" ? 'yr' : 'mo'}</span>
                    </div>
                    {interval === "YEAR" && plan.price.amount > 0 && (
                      <p className="text-xs text-emerald-500 font-bold mt-1">Includes 2 months free</p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button 
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || !!loading}
                    className={`w-full py-3 rounded-xl text-xs font-black transition-all ${
                      isCurrent 
                      ? "bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 cursor-default border border-slate-100 dark:border-slate-800" 
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none border border-transparent dark:border-white/10"
                    }`}
                  >
                    {isCurrent ? "Active" : loading === plan.id ? "Redirecting..." : "Upgrade"}
                  </button>
                  {plan.price.amount === 0 && isTrialActive && (
                    <p className="text-xs text-amber-500 dark:text-amber-400 font-bold mt-3 flex items-center justify-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Includes 14-day trial of Starter features
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
