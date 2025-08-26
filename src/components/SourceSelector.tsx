import { Box, Button, Stack, Typography } from '@mui/material'
import CloudIcon from '@mui/icons-material/Cloud'
import ComputerIcon from '@mui/icons-material/Computer'
import LoginIcon from '@mui/icons-material/Login'
import { graphEnabled, login } from '../lib/graph'
import { Source } from '../types'

type Props = {
  source: Source
  onChange: (s: Source) => void
}

export default function SourceSelector({ source, onChange }: Props) {
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>Select file source</Typography>
      <Stack direction="row" spacing={2}>
        <Button
          variant={source === 'local' ? 'contained' : 'outlined'}
          startIcon={<ComputerIcon />}
          onClick={() => onChange('local')}
        >Local</Button>
        <Button
          variant={source === 'onedrive' ? 'contained' : 'outlined'}
          startIcon={<CloudIcon />}
          onClick={async () => {
            if (!graphEnabled) { alert('OneDrive is not configured. Set env vars.'); return }
            await login()
            onChange('onedrive')
          }}
        >OneDrive</Button>
        <Button
          variant={source === 'sharepoint' ? 'contained' : 'outlined'}
          startIcon={<CloudIcon />}
          onClick={() => {
            alert('SharePoint browsing UI not implemented yet. Use OneDrive or Local for now.')
          }}
        >SharePoint</Button>
      </Stack>
      {!graphEnabled && (
        <Stack direction="row" alignItems="center" spacing={1} mt={1}>
          <LoginIcon fontSize="small" color="disabled" />
          <Typography variant="caption" color="text.secondary">
            Configure Microsoft Graph in .env to enable OneDrive/SharePoint + Email
          </Typography>
        </Stack>
      )}
    </Box>
  )
}