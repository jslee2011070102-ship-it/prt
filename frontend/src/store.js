/**
 * Zustand 전역 상태 관리
 * - Session 데이터 (브랜드명, 카테고리명)
 * - Step별 데이터 (상품, 분석 결과 등)
 * - UI 상태 (현재 스텝, 로딩, 에러)
 */

import { create } from 'zustand'

const useStore = create((set) => ({
  // === Session 데이터 ===
  meta: {
    brand_name: '',
    category_name: '',
  },

  // === Step 1 데이터 ===
  products: [],

  // === Step 2 데이터 ===
  marketAnalysis: '',
  competitorCandidates: [],

  // === Step 3 데이터 ===
  selectedCompetitors: [],
  competitors: [],
  competitorAnalysis: '',

  // === Step 4 데이터 ===
  generatedReport: '',

  // === UI 상태 ===
  currentStep: 1,
  isLoading: false,
  error: null,

  // === Actions ===

  setMeta: (brand_name, category_name) =>
    set({ meta: { brand_name, category_name } }),

  addProducts: (products) =>
    set({ products }),

  updateProduct: (index, updatedProduct) =>
    set((state) => {
      const newProducts = [...state.products];
      newProducts[index] = updatedProduct;
      return { products: newProducts };
    }),

  deleteProduct: (index) =>
    set((state) => ({
      products: state.products.filter((_, i) => i !== index),
    })),

  addNewProduct: () =>
    set((state) => ({
      products: [
        ...state.products,
        {
          rank: state.products.length + 1,
          name: '',
          brand: '',
          price: null,
          review_count: 0,
          rating: 0,
          volume_text: null,
          form_type: '기타',
        },
      ],
    })),

  setMarketAnalysis: (text) =>
    set({ marketAnalysis: text }),

  setCompetitorCandidates: (candidates) =>
    set({ competitorCandidates: candidates }),

  setSelectedCompetitors: (competitors) =>
    set({ selectedCompetitors: competitors }),

  addCompetitors: (competitors) =>
    set({ competitors }),

  setCompetitorAnalysis: (text) =>
    set({ competitorAnalysis: text }),

  setGeneratedReport: (report) =>
    set({ generatedReport: report }),

  setCurrentStep: (step) =>
    set({ currentStep: step }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  clearError: () =>
    set({ error: null }),

  reset: () =>
    set({
      meta: { brand_name: '', category_name: '' },
      products: [],
      marketAnalysis: '',
      competitorCandidates: [],
      selectedCompetitors: [],
      competitors: [],
      competitorAnalysis: '',
      generatedReport: '',
      currentStep: 1,
      error: null,
    }),
}))

export default useStore
