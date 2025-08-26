# Document Assistant (React + Vite + TS)

A modern web app to process PDF and image documents in the browser:
- Merge PDFs
- Split PDF (page ranges or bookmarks)
- Convert PDF -> JPG images
- Convert JPG images -> single PDF
- Convert PDF -> Word (.docx) as image-based pages
- File sources: local uploads (ready), OneDrive/SharePoint (configure MS Graph to enable)
- Delivery: download, or email via Microsoft Graph (configure to enable)
- Constraints: max 50MB per file, max 20 files per operation
- Progress and error feedback

## Tech
- React + Vite + TypeScript
- Material UI
- pdf-lib (assemble/split/merge PDFs)
- pdfjs-dist (render PDF pages to images and read bookmarks)
- docx (generate .docx with page images)
- msal-browser (Microsoft login) and Graph API calls (optional for OneDrive/SharePoint + email)

## Getting Started

1) Install dependencies:
```bash
npm install
```

2) Configure environment variables (optional to enable Microsoft Graph integration):
- Copy `.env.example` to `.env` and set values:
  - VITE_AZURE_CLIENT_ID: Your Azure AD app (SPA) Client ID
  - VITE_AZURE_TENANT_ID: Your tenant ID (or "common")
  - VITE_AZURE_REDIRECT_URI: e.g. http://localhost:5173
Make sure your Azure AD app is configured as SPA with redirect URI and permissions:
- Microsoft Graph delegated permissions:
  - Files.Read, Files.ReadWrite
  - Mail.Send
  - offline_access, openid, profile
Grant admin consent in Azure Portal.

3) Run the dev server:
```bash
npm run dev
```

4) Open the app at the printed local URL (e.g. http://localhost:5173).

## Notes and Limitations

- PDF -> Word conversion is image-based (each PDF page becomes an image in the .docx). This avoids third-party services and system dependencies while staying 100% npm/browser-based.
- Bookmark-based splitting uses pdfjs-dist to read the outline; mapping bookmarks to page ranges works for many standard PDFs but may vary.
- OneDrive/SharePoint and Email (Microsoft Graph) are optional. If unconfigured, those actions are disabled in the UI.

## Build
```bash
npm run build
npm run preview
```

## License
MIT