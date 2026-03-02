import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './authConfig';

const msalInstance = new PublicClientApplication(msalConfig);

export default function MsalProviderWrapper({ children }) {
    return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
