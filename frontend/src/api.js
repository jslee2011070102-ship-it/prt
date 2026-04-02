/**
 * API 호출 및 스트리밍 처리
 */

const API_BASE = '/api'

/**
 * 카테고리 이미지 파싱
 */
export const uploadCategoryImages = async (files) => {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))

  const response = await fetch(`${API_BASE}/parse/category-images`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`이미지 파싱 실패: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 경쟁사 이미지 파싱
 */
export const uploadCompetitorImages = async (competitorName, files) => {
  const formData = new FormData()
  formData.append('competitor_name', competitorName)
  files.forEach((f) => formData.append('files', f))

  const response = await fetch(`${API_BASE}/parse/competitor-images`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`경쟁사 이미지 파싱 실패: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 시장 분석 (SSE 스트리밍)
 */
export const analyzeMarket = async (products, brand_name, category_name, onChunk) => {
  const response = await fetch(`${API_BASE}/analyze/market`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products, brand_name, category_name }),
  })

  if (!response.ok) {
    throw new Error(`시장 분석 실패: ${response.statusText}`)
  }

  // SSE 스트리밍 처리
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE 메시지 파싱 (data: ... 형식)
      const lines = buffer.split('\n')
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]
        if (line.startsWith('data: ')) {
          const message = line.substring(6)
          onChunk(message)
        }
      }

      // 버퍼에 마지막 불완전한 줄 유지
      buffer = lines[lines.length - 1]
    }

    // 남은 데이터 처리
    buffer += decoder.decode()
    if (buffer.startsWith('data: ')) {
      const message = buffer.substring(6)
      onChunk(message)
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 경쟁사 분석 (SSE 스트리밍)
 */
export const analyzeCompetitors = async (competitors, market_summary, brand_name, onChunk) => {
  const response = await fetch(`${API_BASE}/analyze/competitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ competitors, market_summary, brand_name }),
  })

  if (!response.ok) {
    throw new Error(`경쟁사 분석 실패: ${response.statusText}`)
  }

  // SSE 스트리밍 처리
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]
        if (line.startsWith('data: ')) {
          const message = line.substring(6)
          onChunk(message)
        }
      }

      buffer = lines[lines.length - 1]
    }

    buffer += decoder.decode()
    if (buffer.startsWith('data: ')) {
      const message = buffer.substring(6)
      onChunk(message)
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 기획서 생성 (SSE 스트리밍)
 */
export const generateReport = async (reportData, onChunk) => {
  const response = await fetch(`${API_BASE}/report/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  })

  if (!response.ok) {
    throw new Error(`기획서 생성 실패: ${response.statusText}`)
  }

  // SSE 스트리밍 처리
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]
        if (line.startsWith('data: ')) {
          const message = line.substring(6)
          onChunk(message)
        }
      }

      buffer = lines[lines.length - 1]
    }

    buffer += decoder.decode()
    if (buffer.startsWith('data: ')) {
      const message = buffer.substring(6)
      onChunk(message)
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 기획서 다운로드
 */
export const downloadReport = async (reportData) => {
  const response = await fetch(`${API_BASE}/report/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  })

  if (!response.ok) {
    throw new Error(`기획서 다운로드 실패: ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  // 파일명 추출 (Content-Disposition 헤더에서)
  const contentDisposition = response.headers.get('content-disposition')
  let filename = '기획서.docx'

  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+?)"/)
    if (match) {
      filename = match[1]
    }
  }

  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
