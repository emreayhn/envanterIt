/**
 * MSAL (Azure AD) configuration.
 * Replace TENANT_ID and CLIENT_ID with your Azure Portal values.
 */
export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'YOUR_CLIENT_ID',
        authority:
            import.meta.env.VITE_AZURE_AUTHORITY ||
            'https://login.microsoftonline.com/YOUR_TENANT_ID',
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
    },
};

export const loginRequest = {
    scopes: ['User.Read'],
};

export const graphConfig = {
    graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
    graphPhotoEndpoint: 'https://graph.microsoft.com/v1.0/me/photo/$value',
};
