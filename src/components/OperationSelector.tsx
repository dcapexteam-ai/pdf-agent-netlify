import { ToggleButton, ToggleButtonGroup, Box, Typography } from '@mui/material'
import { Operation } from '../types'

type Props = {
  operation: Operation
  onChange: (op: Operation) => void
}

export default function OperationSelector({ operation, onChange }: Props) {
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>Select operation</Typography>
      <ToggleButtonGroup
        exclusive
        color="primary"
        value={operation}
        onChange={(_, val) => val && onChange(val)}
        sx={{ flexWrap: 'wrap' }}
      >
        <ToggleButton value="merge">Merge PDFs</ToggleButton>
        <ToggleButton value="split-ranges">Split by ranges</ToggleButton>
        <ToggleButton value="split-bookmarks">Split by bookmarks</ToggleButton>
        <ToggleButton value="pdf-to-jpg">PDF → JPG</ToggleButton>
        <ToggleButton value="jpg-to-pdf">JPG → PDF</ToggleButton>
        <ToggleButton value="pdf-to-docx">PDF → Word</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )
}