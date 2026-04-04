/**
 * API 호출 및 스트리밍 처리
 */

const API_BASE = '/api'

/**
 * SSE 스트림을 읽어 onChunk 콜백에 전달하는 헬퍼 함수
 *
 * [수정] 백엔드가 json.dumps()로 인코딩한 청크를 JSON.parse()로 복원.
 * 이유: SSE는 줄바꿈(\n)을 이벤트 구분자로 사용하기 때문에,
 *        청크 안에 \n이 있으면 SSE 파싱 도중 유실된다.
 *        JSON 인코딩하면 \n → "\\n"으로 이스케이프되어 안전하게 전송됨.
 */
async function readSSEStream(response, onChunk) {
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
          const raw = line.substring(6)
          // JSON 디코딩 (백엔드에서 json.dumps()로 인코딩한 경우만 해당)
          // [END], [ERROR] 같은 제어 메시지는 JSON이 아니므로 try/catch로 처리
          let message = raw
          try { message = JSON.parse(raw) } catch (_) { /* 비JSON은 원문 그대로 사용 */ }
          onChunk(message)
        }
      }
      // 아직 완성되지 않은 마지막 줄은 버퍼에 유지
      buffer = lines[lines.length - 1]
    }

    // 스트림 종료 후 남은 데이터 처리
    buffer += decoder.decode()
    if (buffer.startsWith('data: ')) {
      const raw = buffer.substring(6)
      let message = raw
      try { message = JSON.parse(raw) } catch (_) { /* 비JSON은 원문 그대로 사용 */ }
      onChunk(message)
    }
  } finally {
    reader.releaseLock()
  }
}

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

  await readSSEStream(response, onChunk)
}

/**
 * 시장 분석 텍스트에서 경쟁사 후보 추출 (백엔드 Python 정규식 사용)
 * JavaScript 정규식보다 안정적, **볼드** 마크다운도 자동 제거
 */
export const extractCompetitorCandidates = async (analysisText) => {
  const response = await fetch(`${API_BASE}/analyze/extract-competitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis_text: analysisText }),
  })
  if (!response.ok) return []
  const data = await response.json()
  return data.candidates || []
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

  await readSSEStream(response, onChunk)
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

  await readSSEStream(response, onChunk)
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
