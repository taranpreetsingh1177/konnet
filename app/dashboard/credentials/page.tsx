import { CredentialsTable } from "./credentials-table"

export const dynamic = 'force-dynamic';

export default function CredentialsPage() {
    return (
        <div className="h-full">
            <CredentialsTable />
        </div>
    )
}
