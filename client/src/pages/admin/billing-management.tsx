import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { CLINIC_TIER_PRICING } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { FileText, Edit, Mail, Check, Plus, Download, Loader2, Pencil, RefreshCw, DollarSign } from "lucide-react";
import Sidebar from "@/components/sidebar";
import jsPDF from "jspdf";
import 'jspdf-autotable';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Calendar } from "lucide-react";
import { BillingCard } from "@/components/ui/billing-card";
import { BillingHistoryTable } from "@/components/ui/billing-history-table";

// Form handling
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Invoice status badge component
const InvoiceStatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = () => {
    switch (status) {
      case "draft": return "bg-gray-200 text-gray-800";
      case "sent": return "bg-blue-200 text-blue-800";
      case "paid": return "bg-green-200 text-green-800";
      case "overdue": return "bg-red-200 text-red-800";
      case "cancelled": return "bg-amber-200 text-amber-800";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Create Invoice Form Schema
const createInvoiceSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.01, "Amount must be greater than 0")
  ),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  issuedDate: z.string().min(1, "Issue date is required"),
});

type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

// Update Invoice Status Form Schema
const updateInvoiceStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
  paymentMethod: z.string().optional(),
  paymentLink: z.string().optional(),
  notes: z.string().optional(),
  paidDate: z.string().optional(),
});

type UpdateInvoiceStatusFormValues = z.infer<typeof updateInvoiceStatusSchema>;

// Edit Invoice Form Schema
const editInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.01, "Amount must be greater than 0")
  ),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  issuedDate: z.string().min(1, "Issue date is required"),
});

type EditInvoiceFormValues = z.infer<typeof editInvoiceSchema>;

// Create Subscription Form Schema
const createSubscriptionSchema = z.object({
  tier: z.string().min(1, "Subscription tier is required"),
  amount: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().optional(),
  ),
  startDate: z.string().min(1, "Start date is required"),
  paymentMethodId: z.string().optional().default(""),
});

type CreateSubscriptionFormValues = z.infer<typeof createSubscriptionSchema>;

export default function BillingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = useState(false);
  const [viewInvoiceDialogOpen, setViewInvoiceDialogOpen] = useState(false);
  const [editInvoiceDialogOpen, setEditInvoiceDialogOpen] = useState(false);
  const [createSubscriptionDialogOpen, setCreateSubscriptionDialogOpen] = useState(false);

  // Clinic selection state
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [clinicSearchTerm, setClinicSearchTerm] = useState<string>("");

  // Create invoice form
  const createInvoiceForm = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      invoiceNumber: generateInvoiceNumber(),
      issuedDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"), // 30 days from now
    },
  });

  // Update invoice status form
  const updateStatusForm = useForm<UpdateInvoiceStatusFormValues>({
    resolver: zodResolver(updateInvoiceStatusSchema),
    defaultValues: {
      status: "",
      paymentMethod: "",
      paymentLink: "",
      notes: "",
      paidDate: "",
    },
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<InvoiceData>({
    queryKey: ["/api/admin/billing/invoices"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch clinics for dropdown
  const { data: clinicsData, isLoading: clinicsLoading } = useQuery({
    queryKey: ["/api/admin/clinics"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: CreateInvoiceFormValues) => {
      const response = await apiRequest("POST", "/api/admin/billing/invoices", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create invoice");
      }
      return response.json();
    },
    onSuccess: () => {
      setCreateDialogOpen(false);
      createInvoiceForm.reset({
        invoiceNumber: generateInvoiceNumber(),
        issuedDate: format(new Date(), "yyyy-MM-dd"),
        dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/invoices"] });
      toast({
        title: "Invoice Created",
        description: "The invoice has been created successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update invoice status mutation
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async (data: UpdateInvoiceStatusFormValues & { invoiceId: number }) => {
      const { invoiceId, ...updateData } = data;
      const response = await apiRequest(
        "PATCH", 
        `/api/admin/billing/invoices/${invoiceId}/status`, 
        updateData
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update invoice status");
      }
      return response.json();
    },
    onSuccess: () => {
      setUpdateStatusDialogOpen(false);
      setSelectedInvoice(null);
      updateStatusForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/invoices/clinic", selectedClinicId] });
      toast({
        title: "Invoice Updated",
        description: "The invoice status has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Resend invoice email mutation
  const resendInvoiceEmailMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest(
        "POST", 
        `/api/admin/billing/invoices/${invoiceId}/resend-email`, 
        {}
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resend invoice email");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "The invoice email has been resent successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Sending Email",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mark invoice as paid mutation
  const markInvoiceAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/admin/billing/invoices/${invoiceId}/status`, 
        { status: "paid", paidDate: format(new Date(), "yyyy-MM-dd") }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark invoice as paid");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/invoices/clinic", selectedClinicId] });
      toast({
        title: "Invoice Updated",
        description: "The invoice has been marked as paid.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Edit invoice form
  const editInvoiceForm = useForm<EditInvoiceFormValues>({
    resolver: zodResolver(editInvoiceSchema),
    defaultValues: {
      invoiceNumber: "",
      amount: undefined,
      description: "",
      dueDate: "",
      issuedDate: "",
    },
  });

  // Edit invoice mutation
  const editInvoiceMutation = useMutation({
    mutationFn: async (data: EditInvoiceFormValues & { invoiceId: number }) => {
      const { invoiceId, ...updateData } = data;
      const response = await apiRequest(
        "PATCH", 
        `/api/admin/billing/invoices/${invoiceId}`, 
        updateData
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update invoice");
      }
      return response.json();
    },
    onSuccess: () => {
      setEditInvoiceDialogOpen(false);
      setSelectedInvoice(null);
      editInvoiceForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/invoices/clinic", selectedClinicId] });
      toast({
        title: "Invoice Updated",
        description: "The invoice has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle invoice creation
  const onCreateInvoice = (values: CreateInvoiceFormValues) => {
    createInvoiceMutation.mutate(values);
  };

  // Handle invoice status update
  const onUpdateInvoiceStatus = (values: UpdateInvoiceStatusFormValues) => {
    if (!selectedInvoice) return;

    updateInvoiceStatusMutation.mutate({
      invoiceId: selectedInvoice.id,
      ...values
    });
  };

  // Generate a unique invoice number
  function generateInvoiceNumber() {
    const prefix = "INV";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}-${timestamp}${random}`;
  }

  // Open update status dialog with selected invoice
  const openUpdateStatusDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    updateStatusForm.reset({
      status: invoice.status,
      paymentMethod: invoice.paymentMethod || "",
      paymentLink: invoice.paymentLink || "",
      notes: invoice.notes || "",
      paidDate: invoice.paidDate ? format(new Date(invoice.paidDate), "yyyy-MM-dd") : "",
    });
    setUpdateStatusDialogOpen(true);
  };

  // Open view invoice dialog
  const openViewInvoiceDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    setViewInvoiceDialogOpen(true);
  };

  // Open edit invoice dialog
  const openEditInvoiceDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    editInvoiceForm.reset({
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      description: invoice.description || "",
      issuedDate: format(new Date(invoice.issuedDate), "yyyy-MM-dd"),
      dueDate: format(new Date(invoice.dueDate), "yyyy-MM-dd"),
    });
    setEditInvoiceDialogOpen(true);
  };

  // Handle edit invoice submission
  const onEditInvoice = (values: EditInvoiceFormValues) => {
    if (!selectedInvoice) return;

    editInvoiceMutation.mutate({
      invoiceId: selectedInvoice.id,
      ...values
    });
  };

  // Handle resend invoice email
  const handleResendEmail = (invoice: any) => {
    resendInvoiceEmailMutation.mutate(invoice.id);
  };

  // Handle mark invoice as paid
  const handleMarkAsPaid = (invoice: any) => {
    if (invoice.status === 'paid') {
      toast({
        title: "Invoice Already Paid",
        description: "This invoice has already been marked as paid.",
        variant: "default",
      });
      return;
    }

    markInvoiceAsPaidMutation.mutate(invoice.id);
  };

  // Find clinic name by ID
  const getClinicName = (clinicId: string) => {
    if (!clinicsData || !Array.isArray(clinicsData)) return clinicId;
    const clinic = clinicsData.find((c: any) => c.id === clinicId);
    return clinic ? clinic.name : clinicId;
  };

  // Create subscription form
  const createSubscriptionForm = useForm<CreateSubscriptionFormValues>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      tier: "",
      amount: undefined,
      startDate: format(new Date(), "yyyy-MM-dd"), // Default to today
      paymentMethodId: "",
    },
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: CreateSubscriptionFormValues & { clinicId: string }) => {
      const response = await apiRequest(
        "POST", 
        "/api/admin/billing/subscriptions", 
        data
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create subscription");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/clinic-subscription", selectedClinicId] });
      toast({
        title: "Subscription Created",
        description: "The subscription has been created successfully.",
        variant: "default",
      });
      setCreateSubscriptionDialogOpen(false);
      createSubscriptionForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Subscription",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle subscription creation/update
  const onSubmitSubscription = (values: CreateSubscriptionFormValues) => {
    if (!selectedClinicId) {
      toast({
        title: "No Clinic Selected",
        description: "Please select a clinic before creating a subscription.",
        variant: "destructive",
      });
      return;
    }

    createSubscriptionMutation.mutate({
      ...values,
      clinicId: selectedClinicId
    });
  };

  // Update form amount when subscription tier changes
  const handleTierChange = (tier: string) => {
    if (tier && tier !== "enterprise") {
      // Use the predefined price for standard tiers
      const tierPrice = typeof CLINIC_TIER_PRICING[tier as keyof typeof CLINIC_TIER_PRICING] === 'number' 
        ? CLINIC_TIER_PRICING[tier as keyof typeof CLINIC_TIER_PRICING] 
        : 0;

      createSubscriptionForm.setValue('amount', tierPrice as number);
    } else if (tier === "enterprise") {
      // For enterprise, leave amount blank for custom pricing
      createSubscriptionForm.setValue('amount', undefined);
    }
  };

  // Handle clinic selection change
  const handleClinicSelect = (clinicId: string) => {
    setSelectedClinicId(clinicId);
  };

  // Filter clinics based on search term and exclude platform admin
  const filteredClinics = clinicsData && Array.isArray(clinicsData)
    ? clinicsData
        .filter((clinic: any) => clinic.entityType !== 'platform_admin') // Exclude platform admin
        .filter((clinic: any) => 
          clinic.name.toLowerCase().includes(clinicSearchTerm.toLowerCase()) ||
          clinic.id.toLowerCase().includes(clinicSearchTerm.toLowerCase())
        )
    : [];

  // Fetch clinic subscription data based on selected clinic
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/admin/billing/clinic-subscription", selectedClinicId],
    queryFn: async () => {
      // Pass selectedClinicId as a query parameter
      const url = `/api/admin/billing/clinic-subscription?clinicId=${selectedClinicId}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          // Return null if no subscription found (not an error)
          return null;
        }
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedClinicId, // Only fetch when a clinic is selected
  });

  // Fetch clinic-specific invoices when a clinic is selected
  const { data: clinicInvoicesData, isLoading: clinicInvoicesLoading } = useQuery<InvoiceData>({
    queryKey: ["/api/admin/billing/invoices/clinic", selectedClinicId],
    queryFn: async () => {
      // Pass selectedClinicId as part of the path
      const url = `/api/admin/billing/invoices/clinic/${selectedClinicId}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          // Return empty list if no invoices found (not an error)
          return { invoices: [] };
        }
        throw new Error(`Failed to fetch invoices: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!selectedClinicId, // Only fetch when a clinic is selected
  });

  // Fetch available clinic tiers
  const { data: tierData } = useQuery({
    queryKey: ["/api/clinic/tiers"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Show loading state if data is loading
  if (invoicesLoading || clinicsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Type definitions for data
  interface InvoiceData {
    invoices: Array<{
      id: number;
      invoiceNumber: string;
      clinicId: string;
      amount: number;
      issuedDate: string;
      dueDate: string;
      status: string;
      description?: string;
      paymentMethod?: string;
      paymentLink?: string;
      paidDate?: string;
      createdAt: string;
    }>;
  }

  interface SubscriptionData {
    subscription?: {
      id: string;
      clinicId: string;
      tier: string;
      status: string;
      amount: number;
      startDate: string;
      endDate?: string;
      createdAt: string;
    };
  }

  // Get the current active subscription for the selected clinic
  const activeSubscription = subscriptionData?.subscription;

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handle invoice download - Generate and download invoice as PDF
  const handleDownloadInvoice = (invoice: any) => {
    try {
      const doc = new jsPDF();
      const clinicName = getClinicName(invoice.clinicId);
      const pageWidth = doc.internal.pageSize.getWidth();

      // Add logo and header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("Vitalyst Healthcare", pageWidth/2, 20, { align: "center" });

      // Invoice details header
      doc.setFontSize(16);
      doc.text("INVOICE", pageWidth/2, 30, { align: "center" });

      // Invoice number and dates
      doc.setFontSize(10);
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 14, 40);
      doc.text(`Date: ${format(new Date(invoice.issuedDate), "MMMM d, yyyy")}`, 14, 45);
      doc.text(`Due Date: ${format(new Date(invoice.dueDate), "MMMM d, yyyy")}`, 14, 50);

      // Status
      doc.setFontSize(10);
      doc.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - 60, 40);

      // Bill to
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text("Bill To:", 14, 60);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(clinicName, 14, 65);
      doc.text(`ID: ${invoice.clinicId}`, 14, 70);

      // From
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text("From:", pageWidth - 60, 60);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text("Vitalyst Healthcare", pageWidth - 60, 65);
      doc.text("Kingston, Jamaica", pageWidth - 60, 70);

      // Line
      doc.setDrawColor(220, 220, 220);
      doc.line(14, 80, pageWidth - 14, 80);

      // Items table
      // @ts-ignore - autoTable is added by the jspdf-autotable plugin
      doc.autoTable({
        startY: 85,
        head: [['Description', 'Amount']],
        body: [
          [invoice.description || 'Health Management System Subscription', `$${invoice.amount.toFixed(2)}`],
          ['', ''],
          ['', ''],
          ['Total', `$${invoice.amount.toFixed(2)}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [70, 70, 70], textColor: 255 },
        foot: [['', '']],
        margin: { top: 85, right: 14, bottom: 20, left: 14 },
      });

      // Payment info
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("Payment Information:", 14, finalY);
      doc.setFont(undefined, 'normal');

      if (invoice.paymentMethod) {
        doc.text(`Method: ${invoice.paymentMethod}`, 14, finalY + 5);
      }

      if (invoice.paidDate) {
        doc.text(`Paid on: ${format(new Date(invoice.paidDate), "MMMM d, yyyy")}`, 14, finalY + 10);
      }

      if (invoice.paymentLink) {
        doc.text(`Payment Link: ${invoice.paymentLink}`, 14, finalY + 15);
      }

      // Notes
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("Notes:", 14, finalY + 25);
      doc.setFont(undefined, 'normal');
      doc.text("Thank you for your business. Please make payment by the due date.", 14, finalY + 30);

      // Footer
      doc.setFontSize(8);
      doc.text("Vitalyst Healthcare - Generated on " + format(new Date(), "MMMM d, yyyy"), pageWidth/2, doc.internal.pageSize.getHeight() - 10, {
        align: "center"
      });

      // Save the PDF
      doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);

      toast({
        title: "PDF Generated",
        description: `Invoice ${invoice.invoiceNumber} has been downloaded`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF",
        variant: "destructive",
      });
    }
  };

  // Main component render
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-neutral-900">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Billing Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage invoices and subscriptions for clinics
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                size="sm"
                className="flex items-center"
              >
                <Plus className="mr-1 h-4 w-4" />
                Create Invoice
              </Button>

              <Button 
                onClick={() => {
                  if (!selectedClinicId) {
                    toast({
                      title: "No Clinic Selected",
                      description: "Please select a clinic first before managing subscriptions.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setCreateSubscriptionDialogOpen(true);
                }}
                size="sm"
                variant="outline"
                className="flex items-center"
              >
                <CreditCard className="mr-1 h-4 w-4" />
                Manage Subscription
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Clinic Selector</CardTitle>
              </div>
              <CardDescription>
                Select a clinic to view its invoices and subscription details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="relative">
                  <Input
                    placeholder="Search clinics by name or ID..."
                    value={clinicSearchTerm}
                    onChange={(e) => setClinicSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClinics.map((clinic: any) => (
                    <Card
                      key={clinic.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedClinicId === clinic.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleClinicSelect(clinic.id)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{clinic.name}</CardTitle>
                        <CardDescription>{clinic.tier}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-500">ID: {clinic.id}</p>
                        {clinic.status && (
                          <div className="mt-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              clinic.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {clinic.status.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedClinicId && (
            <div className="space-y-6">
              <BillingCard billingData={subscriptionData?.subscription ? {
                tier: subscriptionData.subscription.tier,
                subscription_status: subscriptionData.subscription.status,
                amount: subscriptionData.subscription.amount,
                created_at: subscriptionData.subscription.createdAt
              } : undefined} />

              <Card className="mt-6">
                <CardHeader className="bg-muted/50">
                  <CardTitle>Clinic Subscription</CardTitle>
                  <CardDescription>
                    Manage subscription for {getClinicName(selectedClinicId)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {subscriptionLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : activeSubscription ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Tier</h4>
                          <p className="text-lg font-semibold">{activeSubscription.tier}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Status</h4>
                          <p className="text-lg font-semibold capitalize">{activeSubscription.status}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Amount</h4>
                          <p className="text-lg font-semibold">{formatCurrency(activeSubscription.amount)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Start Date</h4>
                          <p className="text-base">
                            {format(new Date(activeSubscription.startDate), "MMMM d, yyyy")}
                          </p>
                        </div>
                        {activeSubscription.endDate && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">End Date</h4>
                            <p className="text-base">
                              {format(new Date(activeSubscription.endDate), "MMMM d, yyyy")}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setCreateSubscriptionDialogOpen(true)}
                        >
                          Update Subscription
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        No active subscription found for this clinic
                      </p>
                      <Button onClick={() => setCreateSubscriptionDialogOpen(true)}>
                        Create Subscription
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <BillingHistoryTable billingHistory={clinicInvoicesData?.invoices || []} />

              <Card>
                <CardHeader className="bg-muted/50">
                  <CardTitle>Clinic Invoices</CardTitle>
                  <CardDescription>
                    Manage invoices for {getClinicName(selectedClinicId)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {clinicInvoicesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : clinicInvoicesData && clinicInvoicesData.invoices.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clinicInvoicesData.invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{format(new Date(invoice.issuedDate), "MMM d, yyyy")}</TableCell>
                            <TableCell>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</TableCell>
                            <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell>
                              <InvoiceStatusBadge status={invoice.status} />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openViewInvoiceDialog(invoice)}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  View
                                </Button>

                                {invoice.status !== 'paid' && (
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkAsPaid(invoice)}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Mark Paid
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResendEmail(invoice)}
                                >
                                  <Mail className="h-4 w-4 mr-1" />
                                  Resend
                                </Button>

                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openUpdateStatusDialog(invoice)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Status
                                </Button>

                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openEditInvoiceDialog(invoice)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground mb-4">No invoices found for this clinic</p>
                      <Button onClick={() => setCreateDialogOpen(true)}>
                        Create First Invoice
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!selectedClinicId && (
            <Card>
              <CardHeader>
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>
                  System-wide view of all invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesData && invoicesData.invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Clinic</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesData.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{getClinicName(invoice.clinicId)}</TableCell>
                          <TableCell>{format(new Date(invoice.issuedDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openViewInvoiceDialog(invoice)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>

                              {invoice.status !== 'paid' && (
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkAsPaid(invoice)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Mark Paid
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendEmail(invoice)}
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Resend
                              </Button>

                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openUpdateStatusDialog(invoice)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Status
                              </Button>

                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditInvoiceDialog(invoice)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">No invoices found in the system</p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      Create First Invoice
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice for a clinic. Fill in the details below.
            </DialogDescription>
          </DialogHeader>

          <Form {...createInvoiceForm}>
            <form onSubmit={createInvoiceForm.handleSubmit(onCreateInvoice)} className="space-y-4">
              <FormField
                control={createInvoiceForm.control}
                name="clinicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinic</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);

                        // Find the clinic to determine its tier
                        const selectedClinic = clinicsData?.find((clinic: any) => clinic.id === value);
                        if (selectedClinic) {
                          const clinicTier = selectedClinic.tier;

                          // Set default amount based on tier pricing
                          if (clinicTier && clinicTier !== 'enterprise') {
                            // Use the predefined amount for standard tiers
                            const tierAmount = CLINIC_TIER_PRICING[clinicTier] || 0;
                            createInvoiceForm.setValue('amount', tierAmount);
                          } else if (clinicTier === 'enterprise') {
                            // For enterprise, leave amount field empty for custom pricing
                            createInvoiceForm.setValue('amount', undefined);
                          }
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a clinic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinicsData && Array.isArray(clinicsData) && 
                          clinicsData
                            .filter((clinic: any) => clinic.entityType !== 'platform_admin') // Filter out platform admin
                            .map((clinic: any) => (
                              <SelectItem key={clinic.id} value={clinic.id}>
                                {clinic.name} ({clinic.tier})
                              </SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createInvoiceForm.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createInvoiceForm.control}
                name="amount"
                render={({ field }) => {
                  // Check the selected clinic's tier to determine if amount should be editable
                  const clinicId = createInvoiceForm.watch('clinicId');
                  const selectedClinic = clinicsData?.find((clinic: any) => clinic.id === clinicId);
                  const isEnterpriseClinic = selectedClinic?.tier === 'enterprise';

                  return (
                    <FormItem>
                      <FormLabel>Amount (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              // Only allow editing if it's an enterprise clinic
                              if (isEnterpriseClinic) {
                                field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value));
                              }
                            }}
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            readOnly={!isEnterpriseClinic}
                          />
                        </div>
                      </FormControl>
                      {!isEnterpriseClinic && clinicId && (
                        <FormDescription>
                          Auto-filled based on clinic tier
                        </FormDescription>
                      )}
                      {isEnterpriseClinic && (
                        <FormDescription>
                          Custom pricing for enterprise tier
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createInvoiceForm.control}
                  name="issuedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createInvoiceForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createInvoiceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Monthly subscription fee" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                >
                  {createInvoiceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Invoice
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewInvoiceDialogOpen} onOpenChange={setViewInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Complete information about this invoice
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{selectedInvoice.invoiceNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getClinicName(selectedInvoice.clinicId)}
                  </p>
                </div>
                <InvoiceStatusBadge status={selectedInvoice.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Issue Date</h4>
                  <p>{format(new Date(selectedInvoice.issuedDate), "MMMM d, yyyy")}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Due Date</h4>
                  <p>{format(new Date(selectedInvoice.dueDate), "MMMM d, yyyy")}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Amount</h4>
                <p className="text-2xl font-bold">{formatCurrency(selectedInvoice.amount)}</p>
              </div>

              {selectedInvoice.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p>{selectedInvoice.description}</p>
                </div>
              )}

              {selectedInvoice.paymentMethod && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Payment Method</h4>
                  <p>{selectedInvoice.paymentMethod}</p>
                </div>
              )}

              {selectedInvoice.paidDate && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Paid Date</h4>
                  <p>{format(new Date(selectedInvoice.paidDate), "MMMM d, yyyy")}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  disabled
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button onClick={() => setViewInvoiceDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editInvoiceDialogOpen} onOpenChange={setEditInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update the details of invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <Form {...editInvoiceForm}>
            <form onSubmit={editInvoiceForm.handleSubmit(onEditInvoice)} className="space-y-4">
              <FormField
                control={editInvoiceForm.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editInvoiceForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className="pl-8"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editInvoiceForm.control}
                  name="issuedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editInvoiceForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editInvoiceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Monthly subscription fee" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditInvoiceDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={editInvoiceMutation.isPending}
                >
                  {editInvoiceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Update Invoice Status Dialog */}
      <Dialog open={updateStatusDialogOpen} onOpenChange={setUpdateStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Invoice Status</DialogTitle>
            <DialogDescription>
              Change the status of invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <Form {...updateStatusForm}>
            <form onSubmit={updateStatusForm.handleSubmit(onUpdateInvoiceStatus)} className="space-y-4">
              <FormField
                control={updateStatusForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {updateStatusForm.watch('status') === 'paid' && (
                <FormField
                  control={updateStatusForm.control}
                  name="paidDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          defaultValue={format(new Date(), 'yyyy-MM-dd')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={updateStatusForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateStatusForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any additional notes about this invoice status change" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setUpdateStatusDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateInvoiceStatusMutation.isPending}
                >
                  {updateInvoiceStatusMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create/Update Subscription Dialog */}
      <Dialog open={createSubscriptionDialogOpen} onOpenChange={setCreateSubscriptionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {activeSubscription ? "Update Subscription" : "Create Subscription"}
            </DialogTitle>
            <DialogDescription>
              {activeSubscription 
                ? `Update subscription details for ${getClinicName(selectedClinicId || '')}`
                : `Create a new subscription for ${getClinicName(selectedClinicId || '')}`
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...createSubscriptionForm}>
            <form onSubmit={createSubscriptionForm.handleSubmit(onSubmitSubscription)} className="space-y-4">
              <FormField
                control={createSubscriptionForm.control}
                name="tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Tier</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleTierChange(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tierData && Object.entries(tierData).map(([key, tier]: [string, any]) => (
                          <SelectItem key={key} value={key}>
                            {tier.name} - {key === 'enterprise' ? 'Custom pricing' : (
                              typeof CLINIC_TIER_PRICING[key] === 'number' ? `$${CLINIC_TIER_PRICING[key]}` : ''
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createSubscriptionForm.control}
                name="amount"
                render={({ field }) => {
                  // When tier is not enterprise, disable the field and use standard pricing
                  const tierType = createSubscriptionForm.watch('tier');
                  const isEditable = tierType === 'enterprise';

                  return (
                    <FormItem>
                      <FormLabel>Amount (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              if (isEditable) {
                                field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value));
                              }
                            }}
                            type="number" 
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            readOnly={!isEditable}
                          />
                        </div>
                      </FormControl>
                      {isEditable && (
                        <FormDescription>
                          Custom pricing for enterprise tier
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={createSubscriptionForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Start Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        placeholder="Select a start date"
                      />
                    </FormControl>
                    <FormDescription>
                      When billing should begin (defaults to today if not specified)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createSubscriptionForm.control}
                name="paymentMethodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None (Invoice Only)</SelectItem>
                        <SelectItem value="card_1">Credit Card</SelectItem>
                        <SelectItem value="bank_1">Bank Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This will be used for automated billing
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateSubscriptionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createSubscriptionMutation.isPending || !selectedClinicId}
                >
                  {createSubscriptionMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {activeSubscription ? "Update Subscription" : "Create Subscription"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}