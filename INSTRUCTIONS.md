# Google Cloud Console Setup

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a project (or use an existing one).
3.  Enable the **Gmail API**.
4.  Go to **Credentials** -> **Create Credentials** -> **OAuth 2.0 Client IDs**.
5.  Set the Application Type to **Web application**.
6.  Add `http://localhost:3000/api/google/callback` to **Authorized redirect URIs**.
7.  Copy the **Client ID** and **Client Secret**.
8.  Open `d:/alvion/products/konnet/.env.local` and paste them into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

After doing this, restarting the server (`bun run dev`) might be necessary to pick up the new env vars. Then you can go to the "Credentials" tab and click "Connect New Account".
