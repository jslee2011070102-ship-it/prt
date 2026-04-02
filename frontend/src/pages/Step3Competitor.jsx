import React, { useState } from 'react'
import useStore from '../store'
import * as api from '../api'
import ImageUploadZone from '../components/ImageUploadZone'
import StreamingText from '../components/StreamingText'

export default function Step3Competitor() {
  const {
    competitorCandidates,
    selectedCompetitors,
    competitors,
    marketAnalysis,
    meta,
    competitorAnalysis,
    setSelectedCompetitors,
    addCompetitors,
    setCompetitorAnalysis,
    setCurrentStep,
    setError,
    setLoading,
    isLoading,
  } = useStore((state) => ({
    competitorCandidates: state.competitorCandidates,
    selectedCompetitors: state.selectedCompetitors,
    competitors: state.competitors,
    marketAnalysis: state.marketAnalysis,
    meta: state.meta,
    competitorAnalysis: state.competitorAnalysis,
    setSelectedCompetitors: state.setSelectedCompetitors,
    addCompetitors: state.addCompetitors,
    setCompetitorAnalysis: state.setCompetitorAnalysis,
    setCurrentStep: state.setCurrentStep,
    setError: state.setError,
    setLoading: state.setLoading,
    isLoading: state.isLoading,
  }))

  const [subStep, setSubStep] = useState('select') // select, upload, analyze
  const [uploadProgress, setUploadProgress] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [competitorFiles, setCompetitorFiles] = useState({})

  // 초기 선택 (상위 5개)
  React.useEffect(() => {
    if (competitorCandidates.length > 0 && selectedCompetitors.length === 0) {
      setSelectedCompetitors(competitorCandidates.slice(0, 5).map((c) => c.name))
    }
  }, [competitorCandidates])

  const handleToggleCompetitor = (name) => {
    setSelectedCompetitors(
      selectedCompetitors.includes(name)
        ? selectedCompetitors.filter((c) => c !== name)
        : [...selectedCompetitors, name]
    )
  }

  const handleImagesSelected = async (competitorName, files) => {
    if (files.length === 0) return

    try {
      setLoading(true)
      setUploadProgress(`${competitorName} 분석 중... 0/${files.length}`)

      const response = await api.uploadCompetitorImages(competitorName, files)
      if (response.error) {
        throw new Error(response.error)
      }

      // 경쟁사 정보 저장
      addCompetitors([...(competitors.filter((c) => c.name !== competitorName) || []), response.competitor])
      setCompetitorFiles({ ...competitorFiles, [competitorName]: files.length })
      setUploadProgress('')
    } catch (error) {
      setError(error.message)
      setUploadProgress('')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeCompetitors = async () => {
    if (competitors.length === 0) {
      setError('최소 1개의 경쟁사 이미지를 업로드해주세요.')
      return
    }

    try {
      setIsAnalyzing(true)
      setLoading(true)
      let fullText = ''

      await api.analyzeCompetitors(
        competitors,
        marketAnalysis,
        meta.brand_name,
        (chunk) => {
          if (chunk !== '[END]' && chunk !== '[ERROR]') {
            fullText += chunk
            setCompetitorAnalysis(fullText)
          }
        }
      )

      setSubStep('analyze')
    } catch (error) {
      setError(error.message)
    } finally {
      setIsAnalyzing(false)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="card">
        <h2 className="card-title">Step 3: 경쟁사 분석</h2>
        <p className="text-gray-600 text-sm">
          {subStep === 'select' && '벤치마킹할 경쟁사를 선택해주세요.'}
          {subStep === 'upload' && '선택된 경쟁사의 상세페이지 스크린샷을 업로드해주세요.'}
          {subStep === 'analyze' && '경쟁사 분석 결과입니다.'}
        </p>
      </div>

      {/* Sub-step A: 경쟁사 선택 */}
      {subStep === 'select' && (
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4">Step A: 경쟁사 선택</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitorCandidates.map((competitor) => (
              <div
                key={competitor.name}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedCompetitors.includes(competitor.name)
                    ? 'border-primary-500 bg-light-bg'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
                onClick={() => handleToggleCompetitor(competitor.name)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedCompetitors.includes(competitor.name)}
                    onChange={() => {}}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{competitor.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{competitor.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
            <p>선택된 경쟁사: {selectedCompetitors.length}개</p>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentStep(2)} className="btn-secondary">
              ← 이전
            </button>
            <button
              onClick={() => setSubStep('upload')}
              disabled={selectedCompetitors.length === 0}
              className={`px-6 py-2 font-semibold rounded-lg transition-colors ${
                selectedCompetitors.length > 0
                  ? 'btn-primary'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              다음: 이미지 업로드 →
            </button>
          </div>
        </div>
      )}

      {/* Sub-step B: 이미지 업로드 */}
      {subStep === 'upload' && (
        <div className="space-y-6">
          {selectedCompetitors.map((competitorName) => (
            <div key={competitorName} className="card">
              <h3 className="font-bold text-gray-700 mb-2">{competitorName}</h3>
              <p className="text-sm text-gray-600 mb-4">상세페이지 스크린샷을 업로드해주세요. (여러 장 가능)</p>

              <ImageUploadZone
                onFilesSelected={(files) => handleImagesSelected(competitorName, files)}
                isLoading={isLoading}
                maxFiles={10}
              />

              {competitorFiles[competitorName] && (
                <p className="text-xs text-green-600 mt-2">✓ {competitorFiles[competitorName]}개 파일 업로드됨</p>
              )}
            </div>
          ))}

          {uploadProgress && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">{uploadProgress}</p>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setSubStep('select')} className="btn-secondary">
              ← 경쟁사 재선택
            </button>
            <button
              onClick={handleAnalyzeCompetitors}
              disabled={competitors.length === 0 || isLoading}
              className={`px-6 py-2 font-semibold rounded-lg transition-colors ${
                competitors.length > 0 && !isLoading
                  ? 'btn-primary'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              분석 시작 →
            </button>
          </div>
        </div>
      )}

      {/* Sub-step C: USP 분석 결과 */}
      {subStep === 'analyze' && (
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4">Step C: 경쟁사 USP 분석</h3>
          <StreamingText content={competitorAnalysis} isLoading={isAnalyzing} />
        </div>
      )}

      {/* 기획서 생성 버튼 */}
      {subStep === 'analyze' && competitorAnalysis.length > 0 && (
        <div className="flex justify-between">
          <button onClick={() => setSubStep('upload')} className="btn-secondary">
            ← 이미지 재업로드
          </button>
          <button onClick={() => setCurrentStep(4)} className="btn-primary">
            기획서 생성 →
          </button>
        </div>
      )}
    </div>
  )
}
