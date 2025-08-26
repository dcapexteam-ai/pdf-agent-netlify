import { Box, Button, List, ListItem, ListItemText, Stack, Typography } from '@mui/material'

type Item = { name: string, blob: Blob }

type Props = {
  items: Item[]
}

export default function ResultPanel({ items }: Props) {
  if (!items.length) return null
  const save = (it: Item) => {
    const url = URL.createObjectURL(it.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = it.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>Results</Typography>
      <List dense>
        {items.map((it, idx) => (
          <ListItem key={idx}
            secondaryAction={<Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => save(it)}>Download</Button>
            </Stack>}
          >
            <ListItemText
              primary={it.name}
              secondary={`${(it.blob.size / 1024 / 1024).toFixed(2)} MB`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}