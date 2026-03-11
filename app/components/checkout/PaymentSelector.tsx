import Image from "next/image";

export default function PaymentSelector({ value, onChange }: any) {
    return (
        <div className="mt-6">
            <h2 className="font-semibold mb-3">Payment method</h2>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => onChange("MTN_MOMO")}
                    className={`border rounded-xl p-4 flex justify-center ${value === "MTN_MOMO" ? "border-yellow-400" : ""
                        }`}
                >
                    <Image src="/payments/mtn-momo.svg" alt="MTN MoMo" width={80} height={40} />
                </button>

                <button
                    onClick={() => onChange("ORANGE_MONEY")}
                    className={`border rounded-xl p-4 flex justify-center ${value === "ORANGE_MONEY" ? "border-orange-500" : ""
                        }`}
                >
                    <Image src="/payments/orange-money.svg" alt="Orange Money" width={80} height={40} />
                </button>
            </div>
        </div>
    );
}
