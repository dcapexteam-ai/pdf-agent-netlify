import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Box, Typography } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { MAX_FILES, MAX_FILE_SIZE_BYTES, validateFiles } from '../utils/validation'

type Props = {
  onFiles: (files: File[]) => void
}

export default function FileDropZone({ onFiles }: Props) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const errors = validateFiles(acceptedFiles)
    if (errors.length) {
      alert(errors.join('\n'))
      return
    }
    onFiles(acceptedFiles)
  }, [onFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxFiles: MAX_FILES,
    maxSize: MAX_FILE_SIZE_BYTES
  })

  return (
    <Box
      {...getRootProps()}
      sx={{
        p: 4, border: '2px dashed', borderColor: isDragActive ? 'primary.main' : 'divider',
        borderRadius: 2, textAlign: 'center', cursor: 'pointer', bgcolor: isDragActive ? 'action.hover' : 'transparent'
      }}
    >
      <input {...getInputProps()} />
      <CloudUploadIcon fontSize="large" color="action" />
      <Typography variant="body1" mt={1}>
        Drag and drop files here, or click to select (max {MAX_FILES} files, ≤ 50MB each)
      </Typography>
    </Box>
  )
}