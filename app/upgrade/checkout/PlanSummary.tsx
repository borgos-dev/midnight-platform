type Props = {
    plan: "VIP" | "VIP_PLUS";
    price: number;
  };
  
  export default function PlanSummary({ plan, price }: Props) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gray-900 p-5 space-y-2">
        <h2 className="text-lg font-semibold">Plan</h2>
  
        <div className="flex justify-between text-sm text-gray-400">
          <span>Billing</span>
          <span>Monthly</span>
        </div>
  
        <div className="flex justify-between text-sm text-gray-400">
          <span>Price</span>
          <span className="text-white font-semibold">
            {price.toLocaleString()} CFA
          </span>
        </div>
  
        <div className="pt-2 text-xs text-purple-400 font-medium">
          {plan === "VIP" ? "VIP Plan" : "VIP+ Plan"}
        </div>
      </div>
    );
  }
  