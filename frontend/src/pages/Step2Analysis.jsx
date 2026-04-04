import React, { useState, useEffect } from 'react'
import useStore from '../store'
import * as api from '../api'
import StreamingText from '../components/StreamingText'
import ProgressBar from '../components/ProgressBar'

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
  const [manualName, setManualName] = useState('')

  useEffect(() => {
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

      const candidates = await api.extractCompetitorCandidates(fullText)
      setCompetitorCandidates(candidates)
    } catch (error) {
      setError(error.message)
    } finally {
      setIsAnalyzing(false)
      setLoading(false)
    }
  }

  const handleAddManual = () => {
    const name = manualName.trim()
    if (!name) return
    if (competitorCandidates.some((c) => c.name === name)) {
      setManualName('')
      return
    }
    setCompetitorCandidates([...competitorCandidates, { name, reason: '수동 추가' }])
    setManualName('')
  }

  const handleRemove = (name) => {
    setCompetitorCandidates(competitorCandidates.filter((c) => c.name !== name))
  }

  const isAnalysisComplete = marketAnalysis.length > 0

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-title">Step 2: 시장 분석</h2>
        <p className="text-gray-600 text-sm mb-3">
          {isAnalysisComplete
            ? '분석이 완료되었습니다. 아래에서 결과를 확인할 수 있습니다.'
            : '카테고리 데이터를 분석 중입니다...'}
        </p>
        {isAnalyzing && (
          <ProgressBar
            percent={null}
            label="시장 분석 중... Claude가 데이터를 처리하고 있습니다"
          />
        )}
        {isAnalysisComplete && !isAnalyzing && (
          <ProgressBar percent={100} label="분석 완료" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-4">분석 결과</h3>
            <StreamingText content={marketAnalysis} isLoading={isAnalyzing} />
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4">경쟁사 후보</h3>

          {competitorCandidates.length > 0 ? (
            <div className="space-y-2 mb-4">
              {competitorCandidates.slice(0, 10).map((competitor, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-light-bg rounded-lg border border-gray-300 flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-primary-500 truncate">{competitor.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{competitor.reason}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(competitor.name)}
                    className="text-gray-400 hover:text-red-500 text-xs flex-shrink-0 mt-0.5 px-1"
                    title="제거"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-4">
              {isAnalyzing ? '분석 중입니다...' : '경쟁사 후보가 없습니다. 직접 추가해주세요.'}
            </p>
          )}

          <div className="border-t pt-3">
            <p className="text-xs text-gray-500 mb-2">직접 추가</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
                placeholder="브랜드명 입력 후 Enter"
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={handleAddManual}
                disabled={!manualName.trim()}
                className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex-shrink-0 ${
                  manualName.trim()
                    ? 'btn-primary'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setCurrentStep(1)} className="btn-secondary">
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
