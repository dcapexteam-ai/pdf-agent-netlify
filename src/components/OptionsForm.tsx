import { Box, Stack, TextField, Typography } from '@mui/material'
import { OutputTarget } from '../types'

type Props = {
  outputName: string
  setOutputName: (v: string) => void
  outputTarget: OutputTarget
  setOutputTarget: (v: OutputTarget) => void
  email: string
  setEmail: (v: string) => void
  extra?: React.ReactNode
}

export default function OptionsForm({
  outputName, setOutputName,
  outputTarget, setOutputTarget,
  email, setEmail,
  extra
}: Props) {
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>Options</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Output base file name"
          value={outputName}
          onChange={(e) => setOutputName(e.target.value)}
          fullWidth
        />
        <TextField
          label="Delivery (download or email)"
          value={outputTarget}
          onChange={(e) => setOutputTarget(e.target.value as OutputTarget)}
          select
          SelectProps={{ native: true }}
          fullWidth
        >
          <option value="download">download</option>
          <option value="email">email</option>
        </TextField>
        <TextField
          label="Email (if delivery = email)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          fullWidth
        />
      </Stack>
      {extra && <Box mt={2}>{extra}</Box>}
    </Box>
  )
}