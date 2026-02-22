import { getGoogleAuthClient } from '@/lib/google';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const oauth2Client = getGoogleAuthClient();
    const { searchParams } = new URL(request.url);
    const loginHint = searchParams.get('login_hint');

    const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        // We can add 'https://www.googleapis.com/auth/userinfo.profile' if we want names
    ];

    const authOptions: any = {
        access_type: 'offline', // Crucial for receiving a refresh token
        scope: scopes,
        prompt: 'consent', // Force consent screen to ensure we get a refresh token every time
    };

    if (loginHint) {
        authOptions.login_hint = loginHint;
    }

    const url = oauth2Client.generateAuthUrl(authOptions);

    return NextResponse.redirect(url);
}
