import { getGoogleAuthClient } from '@/lib/google';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { watchGmail } from '@/lib/gmail';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/dashboard/credentials?error=No code provided', request.url));
    }

    try {
        const oauth2Client = getGoogleAuthClient();
        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);

        // Get user info to identify the account
        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        if (!email) {
            throw new Error('Could not retrieve email from Google');
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Upsert the account
        const { error } = await supabase.from('accounts').upsert({
            user_id: user.id,
            email: email,
            refresh_token: tokens.refresh_token, // This handles the case where it might be null on subsequent logins if we didn't force consent, but we forced it.
            access_token: tokens.access_token,
            expires_at: tokens.expiry_date,
            provider: 'google' // Changed from 'gmail' to 'google' to match other files (e.g. renew-watch)
        }, {
            onConflict: 'user_id,email'
        });

        if (error) {
            console.error('Supabase error:', error);
            throw new Error('Failed to save account');
        }

        // Initialize Gmail Watch
        try {
            await watchGmail(user.id);
            console.log(`Initialized Gmail watch for user ${user.id}`);
        } catch (watchError) {
            console.error('Failed to initialize Gmail watch:', watchError);
            // Don't fail the whole flow if watch fails, but log it.
        }

        return NextResponse.redirect(new URL('/dashboard/credentials?success=Account connected', request.url));

    } catch (error) {
        console.error('Google Auth Error:', error);
        return NextResponse.redirect(new URL('/dashboard/credentials?error=Failed to connect account', request.url));
    }
}
