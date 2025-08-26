import { useMemo, useState } from 'react'
import {
  Alert, AppBar, Box, Button, Chip, Container, Divider, IconButton, Stack, TextField, Toolbar, Typography
} from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'
import FileDropZone from './components/FileDropZone'
import OperationSelector from './components/OperationSelector'
import OptionsForm from './components/OptionsForm'
import ProgressBar from './components/ProgressBar'
import ResultPanel from './components/ResultPanel'
import SourceSelector from './components/SourceSelector'
import { FileItem, Operation, OutputTarget, Progress, Source } from './types'
import { ensureAllJpgs, ensureAllPdfs, validateFiles } from './utils/validation'
import { jpgsToPdf, mergePdfs, pdfToDocxImageBased, pdfToJpgs, splitPdfByBookmarks, splitPdfByRanges } from './lib/pdf'
import { graphEnabled, sendEmailWithAttachment } from './lib/graph'

export default function App() {
  const [source, setSource] = useState<Source>('local')
  const [files, setFiles] = useState<FileItem[]>([])
  const [operation, setOperation] = useState<Operation>('merge')
  const [outputName, setOutputName] = useState('output')
  const [outputTarget, setOutputTarget] = useState<OutputTarget>('download')
  const [email, setEmail] = useState('')
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Array<{ name: string, blob: Blob }>>([])
  const [rangesText, setRangesText] = useState('1-3, 4-4, 5-') // for split by ranges

  const sortedFiles = useMemo(() => files, [files])

  function addFiles(newFiles: File[]) {
    const errs = validateFiles(newFiles)
    if (errs.length) { setError(errs.join('\n')); return }
    const mapped = newFiles.map(f => ({ file: f, id: crypto.randomUUID() }))
    setFiles(prev => [...prev, ...mapped])
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  async function run() {
    setError(null)
    setResults([])
    try {
      if (operation === 'merge') {
        const errs = ensureAllPdfs(sortedFiles.map(f => f.file))
        if (errs.length) throw new Error(errs.join('\n'))
        setProgress({ message: 'Merging PDFs...', percent: 0 })
        const blob = await mergePdfs(sortedFiles.map(f => f.file), (p) => setProgress({ message: 'Merging PDFs...', percent: p }))
        await deliver([{ name: `${outputName || 'merged'}.pdf`, blob }])
      } else if (operation === 'split-ranges') {
        if (sortedFiles.length !== 1) throw new Error('Please provide exactly one PDF for splitting.')
        const f = sortedFiles[0].file
        const errs = ensureAllPdfs([f]); if (errs.length) throw new Error(errs.join('\n'))
        const ranges = parseRanges(rangesText)
        if (!ranges.length) throw new Error('Please provide valid ranges like "1-3,5-7,10-".')
        setProgress({ message: 'Splitting PDF by ranges...', percent: 0 })
        const outputs = await splitPdfByRanges(f, ranges, (p) => setProgress({ message: 'Splitting PDF by ranges...', percent: p }))
        await deliver(outputs.map((o, i) => ({ name: `${outputName || 'split'}_${i + 1}.pdf`, blob: o.blob })))
      } else if (operation === 'split-bookmarks') {
        if (sortedFiles.length !== 1) throw new Error('Please provide exactly one PDF for splitting.')
        const f = sortedFiles[0].file
        const errs = ensureAllPdfs([f]); if (errs.length) throw new Error(errs.join('\n'))
        setProgress({ message: 'Reading bookmarks and splitting...', percent: 0 })
        const outputs = await splitPdfByBookmarks(f, (p) => setProgress({ message: 'Splitting by bookmarks...', percent: p }))
        await deliver(outputs.map((o, i) => ({ name: `${outputName || 'bookmark'}_${i + 1}.pdf`, blob: o.blob })))
      } else if (operation === 'pdf-to-jpg') {
        if (sortedFiles.length !== 1) throw new Error('Please provide exactly one PDF to convert.')
        const f = sortedFiles[0].file
        const errs = ensureAllPdfs([f]); if (errs.length) throw new Error(errs.join('\n'))
        setProgress({ message: 'Converting PDF pages to JPG...', percent: 0 })
        const outputs = await pdfToJpgs(f, (p) => setProgress({ message: 'Converting PDF to JPG...', percent: p }))
        await deliver(outputs.map((o) => ({ name: o.name, blob: o.blob })))
      } else if (operation === 'jpg-to-pdf') {
        const imgs = sortedFiles.map(f => f.file)
        const errs = ensureAllJpgs(imgs); if (errs.length) throw new Error(errs.join('\n'))
        setProgress({ message: 'Converting JPG images to PDF...', percent: 0 })
        const blob = await jpgsToPdf(imgs, (p) => setProgress({ message: 'Converting JPGs...', percent: p }))
        await deliver([{ name: `${outputName || 'images'}.pdf`, blob }])
      } else if (operation === 'pdf-to-docx') {
        if (sortedFiles.length !== 1) throw new Error('Please provide exactly one PDF to convert.')
        const f = sortedFiles[0].file
        const errs = ensureAllPdfs([f]); if (errs.length) throw new Error(errs.join('\n'))
        setProgress({ message: 'Converting PDF to Word (.docx)...', percent: 0 })
        const blob = await pdfToDocxImageBased(f, (p) => setProgress({ message: 'Converting PDF to DOCX...', percent: p }))
        await deliver([{ name: `${outputName || 'document'}.docx`, blob }])
      }
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Something went wrong.')
    } finally {
      setProgress(null)
    }
  }

  async function deliver(items: Array<{ name: string, blob: Blob }>) {
    if (outputTarget === 'download') {
      setResults(items)
      return
    }
    if (outputTarget === 'email') {
      if (!graphEnabled) throw new Error('Email via Microsoft Graph is not configured.')
      if (!email) throw new Error('Please provide a recipient email.')
      setProgress({ message: 'Sending email...', percent: 30 })
      let payloads = items
      if (items.length > 1) {
        const zipped = await zipBlobs(items)
        payloads = [{ name: `${outputName || 'output'}.zip`, blob: zipped }]
      }
      await sendEmailWithAttachment(email, 'Your processed document', 'Please find the file attached.', payloads[0])
      setResults(payloads)
    }
  }

  return (
    <Box>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Document Assistant</Typography>
          <IconButton
            color="inherit"
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
          >
            <GitHubIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={3}>
          <SourceSelector source={source} onChange={setSource} />

          <FileDropZone onFiles={addFiles} />

          {!!files.length && (
            <Stack spacing={1}>
              <Typography variant="subtitle1">Files</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {files.map(f => (
                  <Chip
                    key={f.id}
                    label={`${f.file.name} (${(f.file.size/1024/1024).toFixed(2)}MB)`}
                    onDelete={() => removeFile(f.id)}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Stack>
          )}

          <Divider />

          <OperationSelector operation={operation} onChange={setOperation} />

          {operation === 'split-ranges' && (
            <TextField
              label="Page ranges (e.g., 1-3,4-4,5-)"
              helperText="Use 1-based indices; open-ended like 5- goes to the end"
              value={rangesText}
              onChange={(e) => setRangesText(e.target.value)}
              fullWidth
            />
          )}

          <OptionsForm
            outputName={outputName}
            setOutputName={setOutputName}
            outputTarget={outputTarget}
            setOutputTarget={setOutputTarget}
            email={email}
            setEmail={setEmail}
          />

          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={run} disabled={!files.length}>
              Run
            </Button>
            <Button variant="text" onClick={() => { setFiles([]); setResults([]); setError(null) }}>
              Reset
            </Button>
          </Stack>

          <ProgressBar progress={progress} />

          <ResultPanel items={results} />
        </Stack>
      </Container>
    </Box>
  )
}

// Utilities local to App

function parseRanges(input: string): Array<{ start: number, end: number }> {
  const parts = input.split(',').map(s => s.trim()).filter(Boolean)
  const out: Array<{ start: number, end: number }> = []
  for (const p of parts) {
    const m = p.match(/^(\d+)\s*-\s*(\d+)?$/)
    if (!m) continue
    const start = parseInt(m[1], 10)
    const end = m[2] ? parseInt(m[2], 10) : Number.MAX_SAFE_INTEGER
    if (!Number.isFinite(start) || start <= 0) continue
    out.push({ start, end })
  }
  return out
}

async function zipBlobs(items: Array<{ name: string, blob: Blob }>): Promise<Blob> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const it of items) {
    zip.file(it.name, await it.blob.arrayBuffer())
  }
  const content = await zip.generateAsync({ type: 'blob' })
  return content
}