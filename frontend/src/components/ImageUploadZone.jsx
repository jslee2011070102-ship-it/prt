import React, { useState, useRef } from 'react'

export default function ImageUploadZone({ onFilesSelected, isLoading = false, maxFiles = 25 }) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const fileInputRef = useRef(null)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ALLOWED_TYPES.includes(f.type)
    )

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`최대 ${maxFiles}개 파일까지만 업로드 가능합니다.`)
      return
    }

    handleFilesSelected(files)
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || [])

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`최대 ${maxFiles}개 파일까지만 업로드 가능합니다.`)
      return
    }

    handleFilesSelected(files)
  }

  const handleFilesSelected = (files) => {
    const newFiles = [...selectedFiles, ...files]
    setSelectedFiles(newFiles)
    onFilesSelected(files)

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
  }

  return (
    <div className="space-y-4">
      {/* 드래그앤드롭 영역 */}
      <div
        className={`drop-zone ${isDragging ? 'active' : ''} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        <div className="text-4xl mb-3">📸</div>
        <h3 className="font-bold text-gray-700 mb-1">파일을 드래그해주세요</h3>
        <p className="text-sm text-gray-600 mb-3">또는 클릭하여 파일 선택</p>
        <p className="text-xs text-gray-500">PNG, JPG, WEBP, PDF 형식 (최대 {maxFiles}개)</p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={handleFileInput}
          className="hidden"
          disabled={isLoading}
        />
      </div>

      {/* 선택된 파일 목록 */}
      {selectedFiles.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            선택된 파일 ({selectedFiles.length}/{maxFiles})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="relative group">
                <div className="bg-white rounded-lg border border-gray-300 p-2 aspect-square flex items-center justify-center overflow-hidden">
                  {file.type === 'application/pdf' ? (
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <span className="text-4xl">📄</span>
                      <span className="text-xs mt-1 text-gray-500">PDF</span>
                    </div>
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="파일 제거"
                >
                  ×
                </button>
                <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 로딩 중 메시지 */}
      {isLoading && <div className="text-center text-sm text-gray-600">처리 중입니다...</div>}
    </div>
  )
}
