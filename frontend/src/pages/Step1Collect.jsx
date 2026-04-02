import React, { useState } from 'react'
import useStore from '../store'
import * as api from '../api'
import ImageUploadZone from '../components/ImageUploadZone'
import EditableTable from '../components/EditableTable'
import Papa from 'papaparse'

export default function Step1Collect() {
  const {
    meta,
    products,
    setMeta,
    addProducts,
    setCurrentStep,
    setError,
    setLoading,
    isLoading,
  } = useStore((state) => ({
    meta: state.meta,
    products: state.products,
    setMeta: state.setMeta,
    addProducts: state.addProducts,
    setCurrentStep: state.setCurrentStep,
    setError: state.setError,
    setLoading: state.setLoading,
    isLoading: state.isLoading,
  }))

  const [uploadProgress, setUploadProgress] = useState('')

  const handleMetaChange = (field, value) => {
    setMeta(field === 'brand' ? value : meta.brand_name, field === 'category' ? value : meta.category_name)
  }

  const handleImagesSelected = async (files) => {
    if (files.length === 0) return

    try {
      setLoading(true)
      setUploadProgress(`이미지 분석 중... 0/${files.length}`)

      const response = await api.uploadCategoryImages(files)
      if (response.error) {
        throw new Error(response.error)
      }

      addProducts(response.products)
      setUploadProgress('')
    } catch (error) {
      setError(error.message)
      setUploadProgress('')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (products.length === 0) {
      setError('내보낼 데이터가 없습니다.')
      return
    }

    const csv = Papa.unparse(products)
    const link = document.createElement('a')
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    link.download = `products_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handleImportCSV = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          // 숫자 필드 변환
          const parsed = results.data.map((row) => ({
            ...row,
            rank: parseInt(row.rank) || null,
            price: parseInt(row.price) || null,
            review_count: parseInt(row.review_count) || null,
            rating: parseFloat(row.rating) || null,
            sales_estimate: parseInt(row.sales_estimate) || null,
            revenue_estimate: parseInt(row.revenue_estimate) || null,
          }))
          addProducts(parsed)
        }
      },
      error: (error) => {
        setError(`CSV 파일 로드 실패: ${error.message}`)
      },
    })

    event.target.value = ''
  }

  const canProceed = meta.brand_name && meta.category_name && products.length >= 5

  return (
    <div className="space-y-6">
      {/* 세션 정보 입력 */}
      <div className="card">
        <h2 className="card-title">기본 정보 입력</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">브랜드명 *</label>
            <input
              type="text"
              placeholder="예: 한글톡, 비트, 샤프란"
              value={meta.brand_name}
              onChange={(e) => handleMetaChange('brand', e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">카테고리명 *</label>
            <input
              type="text"
              placeholder="예: 주방세제, 캡슐세탁세제"
              value={meta.category_name}
              onChange={(e) => handleMetaChange('category', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* 이미지 업로드 */}
      <div className="card">
        <h2 className="card-title">Step 1: 카테고리 이미지 업로드</h2>
        <p className="text-gray-600 text-sm mb-4">
          쿠팡 카테고리 TOP 25 스크린샷 (최대 25개) 을 업로드하면 Claude Vision이 자동으로 데이터를 추출합니다.
        </p>

        <ImageUploadZone
          onFilesSelected={handleImagesSelected}
          isLoading={isLoading}
          maxFiles={25}
        />

        {uploadProgress && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">{uploadProgress}</p>
          </div>
        )}
      </div>

      {/* 데이터 테이블 */}
      {products.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">추출된 상품 데이터 ({products.length}개)</h2>
            <div className="flex gap-2">
              <button onClick={handleExportCSV} className="btn-secondary btn-small">
                CSV 내보내기
              </button>
              <label className="btn-secondary btn-small cursor-pointer">
                CSV 불러오기
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <EditableTable products={products} />

          {/* 집계 정보 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">집계 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">총 추정 월매출</p>
                <p className="text-lg font-bold text-primary-500">
                  {products.reduce((sum, p) => sum + (p.revenue_estimate || 0), 0).toLocaleString()}원
                </p>
              </div>
              <div>
                <p className="text-gray-600">평균 리뷰수</p>
                <p className="text-lg font-bold">
                  {Math.round(products.reduce((sum, p) => sum + (p.review_count || 0), 0) / products.length)}개
                </p>
              </div>
              <div>
                <p className="text-gray-600">평균 평점</p>
                <p className="text-lg font-bold">
                  {(products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length).toFixed(1)}★
                </p>
              </div>
              <div>
                <p className="text-gray-600">평균 100ml당</p>
                <p className="text-lg font-bold">
                  {Math.round(products.reduce((sum, p) => sum + (p.price_per_100ml || 0), 0) / products.length)}원
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 다음 Step 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={() => setCurrentStep(2)}
          disabled={!canProceed || isLoading}
          className={`px-6 py-2 font-semibold rounded-lg transition-colors ${
            canProceed && !isLoading
              ? 'btn-primary'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          분석 시작 → (5개 이상 필수)
        </button>
      </div>
    </div>
  )
}
