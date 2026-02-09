# Leads Table Components

This directory contains all components related to the Leads table feature.

## Components

### Main Component
- **`leads-table.tsx`** - Main data table component with columns for Email, Company, Role, and Actions (delete)

### State Components
These components use the shared table components from `/components/table-components.tsx`:

1. **`leads-table-loading.tsx`** - Loading skeleton state
   - Shows 10 rows x 4 columns skeleton
   - Uses `TableLoadingState` from shared components

2. **`leads-table-error.tsx`** - Error state
   - Displays when data fetching fails
   - Includes retry button that reloads the page
   - Uses `TableErrorState` from shared components

3. **`leads-table-empty.tsx`** - Empty state
   - Shows when no leads exist
   - Optional "Add Lead" action button
   - Uses `TableEmptyState` from shared components

## Usage Example

### In a Page Component
```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/lib/trpc/server";
import { LeadsTable } from "@/features/(contact)/leads/components/leads-table";
import { LeadsTableLoading } from "@/features/(contact)/leads/components/leads-table-loading";
import { LeadsTableError } from "@/features/(contact)/leads/components/leads-table-error";

export default function LeadsPage() {
  return (
    <HydrateClient>
      <ErrorBoundary fallback={<LeadsTableError />}>
        <Suspense fallback={<LeadsTableLoading />}>
          <LeadsTable />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
```

### Using the Empty State with Action
```tsx
import { LeadsTableEmpty } from "./leads-table-empty";

// In your component
<LeadsTableEmpty 
  onAddLead={() => {
    // Handle add lead action
    setIsModalOpen(true);
  }}
/>
```

## Features

### Columns
1. **Email** - Primary email with optional name display
2. **Company** - Company logo, name, and domain
3. **Role** - Lead's role/position
4. **Actions** - Three-dot menu with delete action

### Capabilities
- ✅ Search across all leads
- ✅ Column sorting
- ✅ Pagination (10, 20, 30, 40, 50 rows per page)
- ✅ Delete individual leads with confirmation
- ✅ Toast notifications for actions
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ Empty state messaging

## Data Structure

Each lead includes:
```typescript
interface Lead {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  company_id: string | null;
  linkedin_url: string | null;
  created_at: string;
  companies?: {
    id: string;
    name: string;
    domain: string;
    logo_url: string | null;
  } | null;
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
