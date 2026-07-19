import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditLog, AuditLogWithUsername } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, FileText, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityPage() {
  const { user } = useAuth();
  const { data: auditLogs, isLoading } = useQuery<AuditLogWithUsername[]>({
    queryKey: ["/api/audit-logs"],
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Activity Log</h1>
          <p className="text-muted-foreground">
            Track all system activities and changes
          </p>
        </div>

        <Tabs defaultValue="all">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">All Activity</TabsTrigger>
              <TabsTrigger value="patients">Patient Records</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="medical">Medical Records</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Select defaultValue="100">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 entries</SelectItem>
                  <SelectItem value="50">50 entries</SelectItem>
                  <SelectItem value="100">100 entries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="all" className="mt-0">
            <ActivityTable logs={auditLogs} isLoading={isLoading} />
          </TabsContent>
          
          <TabsContent value="patients" className="mt-0">
            <ActivityTable
              logs={auditLogs?.filter(log => log.entityType === 'patient')}
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="appointments" className="mt-0">
            <ActivityTable
              logs={auditLogs?.filter(log => log.entityType === 'appointment')}
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="medical" className="mt-0">
            <ActivityTable
              logs={auditLogs?.filter(log => log.entityType === 'medical_record')}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function ActivityTable({ logs, isLoading }: { logs?: AuditLogWithUsername[]; isLoading: boolean }) {
  if (isLoading) {
    return <ActivityTableSkeleton />;
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No activity logs found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {log.timestamp ? format(new Date(String(log.timestamp)), "MMM dd, yyyy HH:mm") : "-"}
                </TableCell>
                <TableCell>{log.username || `User ${log.userId}`}</TableCell>
                <TableCell>
                  <Badge
                    variant={getBadgeVariant(log.action)}
                    className="font-normal"
                  >
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {getEntityIcon(log.entityType)}
                    <span className="capitalize">
                      {log.entityType.replace("_", " ")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {log.details || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ActivityTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-full max-w-[250px]" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getBadgeVariant(action: string): "default" | "destructive" | "outline" | "secondary" {
  switch (action.toLowerCase()) {
    case "create":
      return "default";
    case "update":
      return "secondary";
    case "delete":
      return "destructive";
    default:
      return "outline";
  }
}

function getEntityIcon(entityType: string) {
  switch (entityType.toLowerCase()) {
    case "patient":
      return <Users className="h-4 w-4 text-blue-500" />;
    case "appointment":
      return <Calendar className="h-4 w-4 text-green-500" />;
    case "medical_record":
      return <FileText className="h-4 w-4 text-amber-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
}