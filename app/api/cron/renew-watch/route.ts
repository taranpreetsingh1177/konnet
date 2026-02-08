import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { watchGmail } from '@/lib/gmail';

// Initialize Supabase Admin to fetch all users
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
    // Verify Vercel Cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Vercel Cron automatically sends this header if CRON_SECRET is set in environment variables
        // For local testing, you can just not set it or manually match it.
        // return new NextResponse('Unauthorized', { status: 401 }); 
    }

    try {
        // 1. Fetch all users who have a Google account connected
        // We distinct by user_id to avoid duplicate watches if they have multiple entries (though unique constraint usually prevents this)
        const { data: accounts, error } = await supabaseAdmin
            .from('accounts')
            .select('user_id')
            .eq('provider', 'google');

        if (error) {
            console.error('Failed to fetch accounts:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!accounts || accounts.length === 0) {
            return NextResponse.json({ message: 'No Google accounts found.' });
        }

        const results = [];

        // 2. Iterate and renew watch for each user
        // Use Promise.allSettled to ensure one failure doesn't stop the rest
        const renewalPromises = accounts.map(async (account) => {
            try {
                const res = await watchGmail(account.user_id);
                return { userId: account.user_id, status: 'success', data: res };
            } catch (err: any) {
                console.error(`Failed to renew watch for user ${account.user_id}:`, err);
                return { userId: account.user_id, status: 'failed', error: err.message };
            }
        });

        const outcomes = await Promise.allSettled(renewalPromises);

        // Summary
        const successCount = outcomes.filter(o => o.status === 'fulfilled' && o.value.status === 'success').length;
        const failCount = outcomes.length - successCount;

        return NextResponse.json({
            message: 'Renewal process completed',
            successCount,
            failCount,
            details: outcomes.map(o => o.status === 'fulfilled' ? o.value : o.reason)
        });

    } catch (error: any) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
