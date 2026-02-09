# Companies Table Components

This directory contains all components related to the Companies table feature.

## Components

### Main Component
- **`companies-table.tsx`** - Main data table component with columns for Company (with logo), Domain, Status, and Actions

### State Components
These components use the shared table components from `/components/table-components.tsx`:

1. **`companies-table-loading.tsx`** - Loading skeleton state
   - Shows loading state while data is being fetched
   - Uses `TableLoadingState` from shared components

2. **`companies-table-error.tsx`** - Error state
   - Displays when data fetching fails
   - Includes retry button that reloads the page
   - Uses `TableErrorState` from shared components

3. **`companies-table-empty.tsx`** - Empty state
   - Shows when no companies exist
   - Optional "Add Company" action button
   - Uses `TableEmptyState` from shared components

## Usage Example

### In a Page Component
```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/lib/trpc/server";
import { CompaniesTable } from "@/features/(contact)/companies/components/companies-table";
import { CompaniesTableLoading } from "@/features/(contact)/companies/components/companies-table-loading";
import { CompaniesTableError } from "@/features/(contact)/companies/components/companies-table-error";

export default function CompaniesPage() {
  return (
    <HydrateClient>
      <ErrorBoundary fallback={<CompaniesTableError />}>
        <Suspense fallback={<CompaniesTableLoading />}>
          <div className="h-full p-4">
            <CompaniesTable />
          </div>
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
```

### Using the Empty State with Action
```tsx
import { CompaniesTableEmpty } from "./companies-table-empty";

// In your component
<CompaniesTableEmpty 
  onAddCompany={() => {
    // Handle add company action
    router.push('/dashboard/companies/new');
  }}
/>
```

## Features

### Capabilities
- ✅ Search across all companies
- ✅ Column sorting
- ✅ Pagination (10, 20, 30, 40, 50 rows per page)
- ✅ Row selection with bulk actions
- ✅ Delete individual companies with confirmation
- ✅ Bulk delete multiple companies
- ✅ Filter by status and other criteria
- ✅ Toast notifications for actions
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ Empty state messaging

## Data Structure

Each company includes:
```typescript
interface Company {
  id: string;
  name: string;
  domain: string;
  logo_url: string | null;
  linkedin_url: string | null;
  status: string;
  created_at: string;
  // ... other fields
}
```

## Shared Dependencies

All state components depend on the reusable table components:
- `/components/table-components.tsx` - Core table infrastructure
  - `TableLoadingState`
  - `TableErrorState`  
  - `TableEmptyState`
  - `TableContainer`
  - `TableToolbar`
  - `TableContent`
  - `TablePagination`

## Styling

All components follow the shadcn/ui design system and use:
- Consistent spacing and layout
- Professional color palette
- Smooth animations and transitions
- Responsive breakpoints
- Accessible UI patterns
