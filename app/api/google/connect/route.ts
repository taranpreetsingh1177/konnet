import { getGoogleAuthClient } from '@/lib/google';
import { NextResponse } from 'next/server';

export async function GET() {
    const oauth2Client = getGoogleAuthClient();

    const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        // We can add 'https://www.googleapis.com/auth/userinfo.profile' if we want names
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial for receiving a refresh token
        scope: scopes,
        prompt: 'consent', // Force consent screen to ensure we get a refresh token every time
    });

    return NextResponse.redirect(url);
}
