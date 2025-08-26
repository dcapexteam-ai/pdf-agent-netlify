import { Box, LinearProgress, Typography } from '@mui/material'
import { Progress } from '../types'

export default function ProgressBar({ progress }: { progress: Progress | null }) {
  if (!progress) return null
  return (
    <Box>
      <Typography variant="body2" gutterBottom>{progress.message}</Typography>
      <LinearProgress variant={progress.percent != null ? 'determinate' : 'indeterminate'} value={progress.percent} />
    </Box>
  )
}