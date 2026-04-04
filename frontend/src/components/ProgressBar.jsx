/**
 * ProgressBar 컴포넌트
 * - percent=null → 무한 애니메이션 (작업 중이지만 진행률 모를 때)
 * - percent=0~100 → 실제 진행률 표시
 */
export default function ProgressBar({ percent = null, label = '', color = '#2E75B6' }) {
  const isIndeterminate = percent === null

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          {!isIndeterminate && (
            <span className="text-sm font-semibold text-primary-500">{Math.round(percent)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        {isIndeterminate ? (
          /* 무한 슬라이딩 애니메이션 */
          <div
            className="h-3 rounded-full animate-indeterminate"
            style={{ background: color, width: '40%' }}
          />
        ) : (
          /* 실제 진행률 바 */
          <div
            className="h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: color }}
          />
        )}
      </div>

      <style>{`
        @keyframes indeterminate {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        .animate-indeterminate {
          animation: indeterminate 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
