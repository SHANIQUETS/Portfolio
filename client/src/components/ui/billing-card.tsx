
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface BillingData {
  tier: string;
  subscription_status: string;
  amount: number;
  created_at: string;
}

interface BillingCardProps {
  billingData?: BillingData;
}

export function BillingCard({ billingData }: BillingCardProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Billing Information</CardTitle>
      </CardHeader>
      <CardContent>
        {billingData ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Current Plan:</span>
              <span className="font-medium">{billingData.tier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Status:</span>
              <span className="font-medium capitalize">{billingData.subscription_status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Monthly Amount:</span>
              <span className="font-medium">
                {billingData.amount ? `$${(billingData.amount / 100).toFixed(2)}` : "Custom Pricing"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Last Billed:</span>
              <span className="font-medium">
                {new Date(billingData.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No billing information found.</p>
        )}
      </CardContent>
    </Card>
  );
}
