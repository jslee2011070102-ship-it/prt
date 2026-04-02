import React, { useState, useEffect } from 'react'
import useStore from '../store'
import * as api from '../api'
import StreamingText from '../components/StreamingText'

export default function Step4Report() {
  const {
    meta,
    products,
    marketAnalysis,
    competitors,
    competitorAnalysis,
    generatedReport,
    setGeneratedReport,
    setCurrentStep,
    setError,
    setLoading,
    isLoading,
  } = useStore((state) => ({
    meta: state.meta,
    products: state.products,
    marketAnalysis: state.marketAnalysis,
    competitors: state.competitors,
    competitorAnalysis: state.competitorAnalysis,
    generatedReport: state.generatedReport,
    setGeneratedReport: state.setGeneratedReport,
    setCurrentStep: state.setCurrentStep,
    setError: state.setError,
    setLoading: state.setLoading,
    isLoading: state.isLoading,
  }))

  const [isGenerating, setIsGenerating] = useState(false)
  const [reportMeta, setReportMeta] = useState({
    brand_name: meta.brand_name,
    category_name: meta.category_name,
  })

  useEffect(() => {
    // Step4에 처음 진입했을 때 기획서 생성이 안 되어있으면 자동으로 생성 시작
    if (!generatedReport) {
      handleGenerateReport()
    }
  }, [])

  const handleGenerateReport = async () => {
    if (isGenerating) return

    try {
      setIsGenerating(true)
      setLoading(true)
      let fullText = ''

      const reportData = {
        meta: {
          brand_name: reportMeta.brand_name,
          category_name: reportMeta.category_name,
        },
        products,
        market_analysis: marketAnalysis,
        competitors,
        competitor_analysis: competitorAnalysis,
      }

      await api.generateReport(reportData, (chunk) => {
        if (chunk !== '[END]' && chunk !== '[ERROR]') {
          fullText += chunk
          setGeneratedReport(fullText)
        }
      })
    } catch (error) {
      setError(error.message)
    } finally {
      setIsGenerating(false)
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      setLoading(true)
      const reportData = {
        meta: {
          brand_name: reportMeta.brand_name,
          category_name: reportMeta.category_name,
        },
        products,
        market_analysis: marketAnalysis,
        competitors,
        competitor_analysis: competitorAnalysis,
      }

      await api.downloadReport(reportData)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const sections = [
    { title: '1. 시장 분석', status: 'completed' },
    { title: '2. 가격대 분포 분석', status: 'completed' },
    { title: '3. 신제품 진출 전략', status: 'completed' },
    { title: '4. 매출 목표 및 KPI', status: 'completed' },
    { title: '5. USP 및 예정 인증', status: 'completed' },
  ]

  const isReportComplete = generatedReport.length > 0

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="card">
        <h2 className="card-title">Step 4: 기획서 생성</h2>
        <p className="text-gray-600 text-sm">
          {isReportComplete
            ? '기획서 생성이 완료되었습니다. 아래에서 다운로드할 수 있습니다.'
            : '기획서를 생성 중입니다...'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 기획서 미리보기 */}
        <div className="lg:col-span-2 card">
          <h3 className="font-bold text-gray-700 mb-4">기획서 내용 미리보기</h3>
          <StreamingText content={generatedReport} isLoading={isGenerating} />
        </div>

        {/* 우측: 섹션 체크리스트 + 메타정보 */}
        <div className="space-y-6">
          {/* 메타정보 */}
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-4">기획서 정보</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">브랜드명</label>
                <input
                  type="text"
                  value={reportMeta.brand_name}
                  onChange={(e) =>
                    setReportMeta({ ...reportMeta, brand_name: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">카테고리명</label>
                <input
                  type="text"
                  value={reportMeta.category_name}
                  onChange={(e) =>
                    setReportMeta({ ...reportMeta, category_name: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">작성일</label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString('ko-KR')}
                  disabled
                  className="text-sm bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* 섹션 체크리스트 */}
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-4">기획서 구성</h3>
            <div className="space-y-2">
              {sections.map((section, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-sm text-gray-700">{section.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 다운로드 버튼 */}
          <button
            onClick={handleDownload}
            disabled={!isReportComplete || isLoading}
            className={`w-full py-3 font-bold rounded-lg transition-colors ${
              isReportComplete && !isLoading
                ? 'btn-primary'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            📥 DOCX 다운로드
          </button>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between">
        <button onClick={() => setCurrentStep(3)} className="btn-secondary">
          ← 이전
        </button>
        <button onClick={() => window.location.reload()} className="btn-secondary">
          🔄 새로운 분석
        </button>
      </div>
    </div>
  )
}
