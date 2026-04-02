import React, { useState } from 'react'
import useStore from '../store'

const FormTypeOptions = ['용기형', '리필파우치', '대용량', '기타']

export default function EditableTable({ products }) {
  const { updateProduct, deleteProduct, addNewProduct } = useStore()
  const [editingCell, setEditingCell] = useState(null)

  const handleCellChange = (rowIdx, field, value) => {
    const product = products[rowIdx]
    let parsedValue = value

    // 숫자 필드 파싱
    if (['rank', 'price', 'review_count', 'sales_estimate', 'revenue_estimate'].includes(field)) {
      parsedValue = value === '' ? null : parseInt(value)
    } else if (['rating', 'price_per_100ml'].includes(field)) {
      parsedValue = value === '' ? null : parseFloat(value)
    }

    const updatedProduct = { ...product, [field]: parsedValue }

    // volume_ml이 변경되면 price_per_100ml 재계산
    if (field === 'volume_ml' && updatedProduct.price) {
      if (parsedValue && parsedValue > 0) {
        updatedProduct.price_per_100ml = Math.round(updatedProduct.price / (parsedValue / 100))
      } else {
        updatedProduct.price_per_100ml = null
      }
    }

    // price가 변경되면 price_per_100ml 재계산
    if (field === 'price' && updatedProduct.volume_ml) {
      if (updatedProduct.volume_ml > 0) {
        updatedProduct.price_per_100ml = Math.round(parsedValue / (updatedProduct.volume_ml / 100))
      } else {
        updatedProduct.price_per_100ml = null
      }
    }

    // sales_estimate가 변경되면 revenue_estimate 재계산
    if (field === 'sales_estimate' && updatedProduct.price) {
      if (parsedValue) {
        updatedProduct.revenue_estimate = Math.round(updatedProduct.price * parsedValue * 2)
      } else {
        updatedProduct.revenue_estimate = null
      }
    }

    // price가 변경되면 revenue_estimate 재계산
    if (field === 'price' && updatedProduct.sales_estimate) {
      updatedProduct.revenue_estimate = Math.round(parsedValue * updatedProduct.sales_estimate * 2)
    }

    updateProduct(rowIdx, updatedProduct)
  }

  const renderCell = (rowIdx, field, value) => {
    const isEditing = editingCell === `${rowIdx}-${field}`

    // 드롭다운 필드 (form_type)
    if (field === 'form_type') {
      return (
        <select
          value={value || ''}
          onChange={(e) => {
            handleCellChange(rowIdx, field, e.target.value)
            setEditingCell(null)
          }}
          className="w-full px-2 py-1 border border-primary-500 rounded text-sm"
        >
          <option value="">선택</option>
          {FormTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }

    // 자동 계산 필드 (읽기 전용)
    if (['price_per_100ml', 'revenue_estimate'].includes(field)) {
      return (
        <div className="px-2 py-1 text-sm bg-gray-50 text-gray-700 rounded">
          {value ? (field === 'revenue_estimate' ? `${value.toLocaleString()}원` : `${value}원`) : '-'}
        </div>
      )
    }

    // 일반 입력 필드
    if (isEditing) {
      return (
        <input
          type={['rank', 'price', 'review_count', 'sales_estimate', 'revenue_estimate'].includes(field) ? 'number' : 'text'}
          value={value || ''}
          onChange={(e) => handleCellChange(rowIdx, field, e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setEditingCell(null)
            if (e.key === 'Escape') setEditingCell(null)
          }}
          autoFocus
          className="w-full px-2 py-1 border border-primary-500 rounded text-sm"
        />
      )
    }

    return (
      <div
        onClick={() => setEditingCell(`${rowIdx}-${field}`)}
        className="px-2 py-1 text-sm cursor-pointer hover:bg-blue-50 rounded"
      >
        {value ? (typeof value === 'number' ? value.toLocaleString() : value) : '-'}
      </div>
    )
  }

  const columns = [
    { key: 'rank', label: '순위' },
    { key: 'name', label: '상품명' },
    { key: 'brand', label: '브랜드' },
    { key: 'price', label: '판매가' },
    { key: 'volume_text', label: '용량' },
    { key: 'price_per_100ml', label: '100ml당' },
    { key: 'review_count', label: '리뷰수' },
    { key: 'rating', label: '평점' },
    { key: 'sales_text', label: '판매량' },
    { key: 'form_type', label: '형태' },
    { key: 'revenue_estimate', label: '추정매출' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th className="w-20">액션</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((col) => (
                <td key={`${rowIdx}-${col.key}`} className="min-w-max">
                  {renderCell(rowIdx, col.key, product[col.key])}
                </td>
              ))}
              <td>
                <button
                  onClick={() => deleteProduct(rowIdx)}
                  className="text-red-600 hover:text-red-800 font-semibold text-sm"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 행 추가 버튼 */}
      <div className="mt-4 flex gap-2">
        <button onClick={addNewProduct} className="btn-secondary btn-small">
          + 행 추가
        </button>
      </div>
    </div>
  )
}
