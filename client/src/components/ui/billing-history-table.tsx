
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

interface BillingRecord {
  id: string;
  amount: number;
  created_at: string;
  subscription_status: string;
}

interface BillingHistoryTableProps {
  billingHistory: BillingRecord[];
}

export function BillingHistoryTable({ billingHistory }: BillingHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billingHistory.length > 0 ? (
              billingHistory.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {new Date(record.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    ${(record.amount / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="capitalize">
                    {record.subscription_status}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6">
                  No billing history found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
