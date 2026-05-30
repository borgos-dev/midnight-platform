import { PLANS, formatPriceCfa, type PaidPlanCode } from "@/app/lib/plans";

type Props = {
  plan: PaidPlanCode;
};

export default function PlanSummary({ plan }: Props) {
  const def = PLANS[plan];
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900 p-5 space-y-2">
      <h2 className="text-lg font-semibold">Plan</h2>

      <div className="flex justify-between text-sm text-gray-400">
        <span>Billing</span>
        <span>Every {def.durationDays} days</span>
      </div>

      <div className="flex justify-between text-sm text-gray-400">
        <span>Price</span>
        <span className="text-white font-semibold">
          {formatPriceCfa(def.priceCfa)}
        </span>
      </div>

      <div className="pt-2 text-xs text-purple-400 font-medium">
        {def.label} Plan
      </div>
    </div>
  );
}
