---
name: Frontend Component Best Practices
description: Guidelines for building reusable React components using shadcn/ui design system and component composition patterns.
---

# Frontend Component Best Practices

## Decision-Making Framework

### BEFORE Creating Any Component, Ask Yourself:

1. **Does this already exist in shadcn/ui?**
   - Check `components/ui` directory first
   - Can I use existing shadcn components with minor prop changes?
   - Example: Need a button? Use `<Button>` from shadcn, don't create custom button

2. **Can I compose existing components?**
   - Can I combine existing shadcn components to achieve this?
   - Example: Dialog + Form + Button instead of custom modal

3. **Is this truly reusable?**
   - Will this component be used in 2+ places?
   - If YES → Create in `components/` directory
   - If NO → Consider inline composition in page file

4. **Does it follow shadcn's design system?**
   - Uses shadcn's color variables (e.g., `bg-background`, `text-foreground`)
   - Uses shadcn's spacing and sizing patterns
   - Extends shadcn components, not replacing them

## Component Organization

### Directory Structure
```
components/
├── ui/                    # shadcn/ui components (generated)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   └── ...
├── companies/             # Domain-specific components
│   ├── company-card.tsx
│   ├── company-list.tsx
│   └── company-form.tsx
├── campaigns/
│   ├── campaign-card.tsx
│   └── campaign-status.tsx
├── shared/                # Truly reusable components
│   ├── data-table.tsx
│   ├── empty-state.tsx
│   └── loading-skeleton.tsx
└── layouts/               # Layout components
    ├── dashboard-layout.tsx
    └── auth-layout.tsx
```

### File Naming Conventions
- **kebab-case** for all files: `company-card.tsx`, `empty-state.tsx`
- **PascalCase** for component names: `CompanyCard`, `EmptyState`
- **Descriptive names**: `user-profile-form.tsx` not `form.tsx`

## Using shadcn Components

### ✅ DO: Extend shadcn Components

```typescript
// components/companies/company-card.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CompanyCardProps {
  name: string;
  domain: string;
  status: "active" | "inactive";
  onEdit: () => void;
}

export function CompanyCard({ name, domain, status, onEdit }: CompanyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{domain}</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant={status === "active" ? "default" : "secondary"}>
          {status}
        </Badge>
      </CardContent>
      <CardFooter>
        <Button onClick={onEdit}>Edit Company</Button>
      </CardFooter>
    </Card>
  );
}
```

### ❌ DON'T: Create Custom Components from Scratch

```typescript
// ❌ BAD: Custom button ignoring shadcn
export function CustomButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded">
      {children}
    </button>
  );
}

// ✅ GOOD: Use shadcn Button with variants
import { Button } from "@/components/ui/button";

<Button variant="default" size="default">{children}</Button>
```

### ✅ DO: Compose shadcn Components

```typescript
// components/campaigns/create-campaign-dialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateCampaignDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Campaign</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new campaign.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input id="name" placeholder="Enter campaign name" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Create Campaign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Styling with shadcn Design System

### ✅ DO: Use CSS Variables from shadcn

```typescript
// Uses shadcn's color system
<div className="bg-background text-foreground">
  <h1 className="text-primary">Title</h1>
  <p className="text-muted-foreground">Description</p>
  <button className="bg-primary text-primary-foreground hover:bg-primary/90">
    Click me
  </button>
</div>
```

### Available shadcn Color Variables:
- `background` / `foreground`
- `card` / `card-foreground`
- `popover` / `popover-foreground`
- `primary` / `primary-foreground`
- `secondary` / `secondary-foreground`
- `muted` / `muted-foreground`
- `accent` / `accent-foreground`
- `destructive` / `destructive-foreground`
- `border`, `input`, `ring`

### ✅ DO: Use shadcn's Spacing and Sizing

```typescript
// Consistent with shadcn patterns
<Card className="p-6">          {/* padding */}
  <div className="space-y-4">   {/* vertical spacing */}
    <div className="flex gap-2"> {/* horizontal gap */}
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  </div>
</Card>
```

### ❌ DON'T: Use Arbitrary Colors

```typescript
// ❌ BAD: Hardcoded colors
<div className="bg-blue-500 text-white">

// ✅ GOOD: shadcn variables
<div className="bg-primary text-primary-foreground">
```

## Component Reusability Patterns

### Pattern 1: Compound Components

```typescript
// components/shared/data-table.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    header: string;
    accessor: keyof T | ((row: T) => React.ReactNode);
  }>;
}

export function DataTable<T>({ data, columns }: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col, i) => (
            <TableHead key={i}>{col.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i}>
            {columns.map((col, j) => (
              <TableCell key={j}>
                {typeof col.accessor === "function"
                  ? col.accessor(row)
                  : String(row[col.accessor])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Usage:
<DataTable
  data={companies}
  columns={[
    { header: "Name", accessor: "name" },
    { header: "Domain", accessor: "domain" },
    { header: "Actions", accessor: (row) => <Button>Edit</Button> },
  ]}
/>
```

### Pattern 2: Polymorphic Components

```typescript
// components/shared/empty-state.tsx
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Usage:
<EmptyState
  icon={<Building2 className="h-12 w-12" />}
  title="No companies found"
  description="Get started by creating your first company"
  action={{
    label: "Create Company",
    onClick: () => setOpen(true),
  }}
/>
```

### Pattern 3: Render Props for Flexibility

```typescript
// components/shared/loading-state.tsx
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LoadingState({ isLoading, children, fallback }: LoadingStateProps) {
  if (isLoading) {
    return <>{fallback || <Skeleton className="h-24 w-full" />}</>;
  }
  return <>{children}</>;
}

// Usage:
<LoadingState 
  isLoading={isLoading} 
  fallback={<CompanyCardSkeleton />}
>
  <CompanyCard {...data} />
</LoadingState>
```

## Working with Forms

### ✅ DO: Use shadcn Form Components with React Hook Form

```typescript
// components/companies/company-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  domain: z.string().url("Must be a valid URL"),
});

type FormValues = z.infer<typeof formSchema>;

interface CompanyFormProps {
  onSubmit: (values: FormValues) => void;
  defaultValues?: Partial<FormValues>;
}

export function CompanyForm({ onSubmit, defaultValues }: CompanyFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      name: "",
      domain: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc" {...field} />
              </FormControl>
              <FormDescription>The legal name of the company</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

## Page File Component Usage

### ❌ DON'T: Create Components Inline in Page Files

```typescript
// app/(dashboard)/companies/page.tsx
// ❌ BAD: Inline component definition
export default function CompaniesPage() {
  const CompanyCard = ({ name }: { name: string }) => (
    <div className="border p-4">
      <h3>{name}</h3>
    </div>
  );

  return (
    <div>
      {companies.map((c) => <CompanyCard name={c.name} />)}
    </div>
  );
}
```

### ✅ DO: Use Separate Component Files

```typescript
// app/(dashboard)/companies/page.tsx
// ✅ GOOD: Import from component file
import { CompanyCard } from "@/components/companies/company-card";

export default function CompaniesPage() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {companies.map((company) => (
        <CompanyCard key={company.id} {...company} />
      ))}
    </div>
  );
}
```

### ⚠️ ACCEPTABLE: Simple Composition for One-Time Use

```typescript
// app/(dashboard)/companies/page.tsx
// ⚠️ ACCEPTABLE: Simple composition that won't be reused
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CompanyList } from "@/components/companies/company-list";

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyList />
        </CardContent>
      </Card>
    </div>
  );
}
```

## Key Decision Tree

```
Need a new UI element?
│
├─ Does it exist in components/ui (shadcn)?
│  ├─ YES → Use it directly with props/variants
│  └─ NO  → Continue...
│
├─ Can I compose existing shadcn components?
│  ├─ YES → Compose them (Dialog + Form + Button)
│  └─ NO  → Continue...
│
├─ Will this be reused in 2+ places?
│  ├─ YES → Create in components/{domain}/
│  └─ NO  → Consider inline composition with shadcn components
│
└─ Does it need custom styling?
   ├─ YES → Extend shadcn component with className
   └─ NO  → Use shadcn component as-is
```

## Key Reminders

### Component Creation
- ✅ **Always** check `components/ui` (shadcn) first
- ✅ **Always** try composing existing components before creating new ones
- ✅ **Always** create reusable components in separate files
- ✅ **Always** organize by domain (`companies/`, `campaigns/`, etc.)
- ❌ **Never** create inline components in page files if they'll be reused
- ❌ **Never** ignore shadcn's design system

### Styling
- ✅ **Always** use shadcn CSS variables (`bg-background`, `text-primary`)
- ✅ **Always** use shadcn component variants (Button variants, Badge variants)
- ✅ **Always** extend with `className` prop, not replace component
- ❌ **Never** use hardcoded colors (`bg-blue-500`) when shadcn variable exists
- ❌ **Never** create custom buttons/inputs/cards from scratch

### Best Practices
- ✅ Use TypeScript interfaces for props
- ✅ Use Zod for form validation
- ✅ Use React Hook Form with shadcn Form components
- ✅ Export components as named exports
- ✅ Co-locate related components in domain folders
- ✅ Use `cn()` utility for conditional classes

### Think Before You Code
1. Can I solve this with existing shadcn components?
2. Can I achieve this by composing components?
3. Is creating a new component truly necessary?
4. Where should this component live?
5. Am I following shadcn's design system?
