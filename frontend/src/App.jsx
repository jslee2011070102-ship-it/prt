import React, { useState } from 'react'
import useStore from './store'
import Step1Collect from './pages/Step1Collect'
import Step2Analysis from './pages/Step2Analysis'
import Step3Competitor from './pages/Step3Competitor'
import Step4Report from './pages/Step4Report'

const StepIndicator = ({ currentStep }) => {
  return (
    <div className="step-indicator">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`step ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}>
            <div className="step-number">{step < currentStep ? '✓' : step}</div>
            <div className="step-label">Step {step}</div>
          </div>
          {step < 4 && <div className={`step-divider ${step < currentStep ? 'active' : ''}`}></div>}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function App() {
  const currentStep = useStore((state) => state.currentStep)
  const error = useStore((state) => state.error)
  const clearError = useStore((state) => state.clearError)
  const [showErrorModal, setShowErrorModal] = useState(false)

  React.useEffect(() => {
    if (error) {
      setShowErrorModal(true)
    }
  }, [error])

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Collect />
      case 2:
        return <Step2Analysis />
      case 3:
        return <Step3Competitor />
      case 4:
        return <Step4Report />
      default:
        return <Step1Collect />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-primary-500">Product Research Tool</h1>
            <p className="text-gray-600 text-sm mt-1">쿠팡 카테고리 신제품 기획 자동화</p>
          </div>
          <span className="text-xs text-gray-400 font-mono mt-1">v0.4</span>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Step 지시자 */}
        <StepIndicator currentStep={currentStep} />

        {/* 에러 모달 */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md">
              <h2 className="text-lg font-bold text-red-600 mb-4">오류 발생</h2>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={() => {
                  setShowErrorModal(false)
                  clearError()
                }}
                className="btn-primary"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* Step 콘텐츠 */}
        {renderStep()}
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-gray-600 text-sm">
          <p>© 2026 Product Research Tool. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
