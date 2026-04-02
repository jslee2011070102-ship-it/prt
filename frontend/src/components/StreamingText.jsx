import React, { useEffect, useRef } from 'react'

export default function StreamingText({ content, isLoading = false }) {
  const containerRef = useRef(null)

  // 콘텐츠가 업데이트될 때 스크롤을 맨 아래로
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [content])

  // 마크다운 스타일 적용 함수
  const renderMarkdown = (text) => {
    if (!text) return null

    const lines = text.split('\n')
    const elements = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // H1 (# ...)
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-2xl font-bold text-primary-500 mt-4 mb-2">
            {line.replace(/^#\s+/, '')}
          </h1>
        )
      }
      // H2 (## ...)
      else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-xl font-bold text-primary-500 mt-3 mb-2">
            {line.replace(/^##\s+/, '')}
          </h2>
        )
      }
      // H3 (### ...)
      else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-lg font-bold text-gray-800 mt-2 mb-1">
            {line.replace(/^###\s+/, '')}
          </h3>
        )
      }
      // 불릿 (- ...)
      else if (line.startsWith('- ')) {
        elements.push(
          <div key={i} className="ml-4 flex gap-2 my-1">
            <span>•</span>
            <span>{line.replace(/^-\s+/, '')}</span>
          </div>
        )
      }
      // 테이블 행 (| ... |)
      else if (line.includes('|')) {
        // 마크다운 테이블 표시 (간단한 형식)
        elements.push(
          <div key={i} className="text-sm text-gray-700 font-mono my-1 px-4 py-1 bg-gray-50 rounded">
            {line}
          </div>
        )
      }
      // 공백 줄
      else if (line.trim() === '') {
        elements.push(<div key={i} className="my-2" />)
      }
      // 일반 텍스트
      else {
        elements.push(
          <p key={i} className="text-gray-700 my-1">
            {line}
          </p>
        )
      }
    }

    return elements
  }

  return (
    <div className="space-y-2">
      {/* 콘텐츠 컨테이너 */}
      <div
        ref={containerRef}
        className="streaming-text whitespace-pre-wrap text-sm leading-relaxed"
      >
        {content ? (
          renderMarkdown(content)
        ) : (
          <p className="text-gray-500">콘텐츠가 없습니다.</p>
        )}

        {/* 로딩 표시 */}
        {isLoading && (
          <div className="inline-block">
            <span className="spinner ml-2"></span>
          </div>
        )}
      </div>

      {/* 상태 표시 */}
      <div className="text-xs text-gray-500 flex items-center gap-2">
        {isLoading ? (
          <>
            <span className="spinner h-4 w-4"></span>
            <span>처리 중...</span>
          </>
        ) : content ? (
          <>
            <span className="text-green-600">✓</span>
            <span>완료</span>
          </>
        ) : (
          <span>대기 중...</span>
        )}
      </div>
    </div>
  )
}
