import React, { useState, useEffect } from 'react'
import useStore from '../store'
import * as api from '../api'
import StreamingText from '../components/StreamingText'

export default function Step2Analysis() {
  const {
    products,
    meta,
    marketAnalysis,
    competitorCandidates,
    setMarketAnalysis,
    setCompetitorCandidates,
    setCurrentStep,
    setError,
    setLoading,
    isLoading,
  } = useStore((state) => ({
    products: state.products,
    meta: state.meta,
    marketAnalysis: state.marketAnalysis,
    competitorCandidates: state.competitorCandidates,
    setMarketAnalysis: state.setMarketAnalysis,
    setCompetitorCandidates: state.setCompetitorCandidates,
    setCurrentStep: state.setCurrentStep,
    setError: state.setError,
    setLoading: state.setLoading,
    isLoading: state.isLoading,
  }))

  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    // Step2에 처음 진입했을 때 분석이 아직 안 되어있으면 자동으로 분석 시작
    if (!marketAnalysis && products.length > 0) {
      handleStartAnalysis()
    }
  }, [])

  const handleStartAnalysis = async () => {
    if (isAnalyzing) return

    try {
      setIsAnalyzing(true)
      setLoading(true)
      let fullText = ''

      await api.analyzeMarket(
        products,
        meta.brand_name,
        meta.category_name,
        (chunk) => {
          if (chunk !== '[END]' && chunk !== '[ERROR]') {
            fullText += chunk
            setMarketAnalysis(fullText)
          }
        }
      )

      // 분석 완료 후 경쟁사 후보 추출
      const candidates = await api.extractCompetitorCandidates(fullText)
      setCompetitorCandidates(candidates)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsAnalyzing(false)
      setLoading(false)
    }
  }

  const extractCompetitors = (text) => {
    // "## 6. 경쟁사 후보 추천" 섹션에서 브랜드명 + 이유 추출
    const match = text.match(/##\s*6[.\.]\s*경쟁사\s*후보\s*추천([\s\S]+?)(?=\n##|$)/)
    if (!match) return []

    const section = match[1]
    const competitors = []
    const lines = section.split('\n')

    for (const line of lines) {
      const lineMatch = line.match(/^-\s+([^:]+?)\s*:\s*(.+?)$/)
      if (lineMatch) {
        competitors.push({
          name: lineMatch[1].trim(),
          reason: lineMatch[2].trim(),
        })
      }
    }

    return competitors
  }

  const isAnalysisComplete = marketAnalysis.length > 0

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="card">
        <h2 className="card-title">Step 2: 시장 분석</h2>
        <p className="text-gray-600 text-sm">
          {isAnalysisComplete
            ? '분석이 완료되었습니다. 아래에서 결과를 확인할 수 있습니다.'
            : '카테고리 데이터를 분석 중입니다...'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 스트리밍 분석 결과 */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-4">분석 결과</h3>
            <StreamingText content={marketAnalysis} isLoading={isAnalyzing} />
          </div>
        </div>

        {/* 우측: 경쟁사 후보 */}
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4">경쟁사 후보</h3>
          {competitorCandidates.length > 0 ? (
            <div className="space-y-3">
              {competitorCandidates.slice(0, 7).map((competitor, idx) => (
                <div key={idx} className="p-3 bg-light-bg rounded-lg border border-gray-300">
                  <p className="font-semibold text-sm text-primary-500">{competitor.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{competitor.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">분석 중입니다...</p>
          )}
        </div>
      </div>

      {/* 다음 Step 버튼 */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(1)}
          className="btn-secondary"
        >
          ← 이전
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          disabled={!isAnalysisComplete}
          className={`px-6 py-2 font-semibold rounded-lg transition-colors ${
            isAnalysisComplete
              ? 'btn-primary'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          경쟁사 분석 →
        </button>
      </div>
    </div>
  )
}
