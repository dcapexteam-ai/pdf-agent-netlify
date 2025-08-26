import { PublicClientApplication, AccountInfo, AuthenticationResult } from 'msal-browser'

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID as string | undefined
const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI as string | undefined

const enabled = !!clientId && !!redirectUri

const msal = enabled ? new PublicClientApplication({
  auth: {
    clientId: clientId!,
    authority: `https://login.microsoftonline.com/${tenantId || 'common'}`,
    redirectUri: redirectUri!,
  },
  cache: { cacheLocation: 'localStorage' }
}) : null

const scopes = ['openid', 'profile', 'offline_access', 'Files.Read', 'Files.ReadWrite', 'Mail.Send']

export async function login(): Promise<AccountInfo | null> {
  if (!msal) throw new Error('Microsoft Graph not configured.')
  const existing = msal.getAllAccounts()[0]
  if (existing) return existing
  const res = await msal.loginPopup({ scopes })
  return res.account
}

async function getToken(): Promise<string> {
  if (!msal) throw new Error('Microsoft Graph not configured.')
  const account = msal.getAllAccounts()[0]
  const res: AuthenticationResult = await msal.acquireTokenSilent({ account, scopes })
    .catch(() => msal.acquireTokenPopup({ scopes }))
  return res.accessToken
}

export const graphEnabled = enabled

export async function listDriveRoot(): Promise<any> {
  const token = await getToken()
  const res = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to list OneDrive root')
  return res.json()
}

export async function downloadDriveItem(itemId: string): Promise<File> {
  const token = await getToken()
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('Failed to download item')
  const blob = await res.blob()
  return new File([blob], `item-${itemId}`, { type: blob.type })
}

export async function sendEmailWithAttachment(to: string, subject: string, bodyText: string, attachment: { name: string, blob: Blob }) {
  const token = await getToken()
  const bytes = new Uint8Array(await attachment.blob.arrayBuffer())
  const base64 = base64FromBytes(bytes)

  const message = {
    message: {
      subject,
      body: { contentType: 'Text', content: bodyText },
      toRecipients: [{ emailAddress: { address: to } }],
      attachments: [
        {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: attachment.name,
          contentType: attachment.blob.type || 'application/octet-stream',
          contentBytes: base64
        }
      ]
    },
    saveToSentItems: true
  }
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  })
  if (!res.ok) throw new Error('Failed to send email.')
}

function base64FromBytes(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}