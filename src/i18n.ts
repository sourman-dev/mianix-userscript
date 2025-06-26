import { createI18n } from 'vue-i18n';

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'vi',
  messages: {
    vi: {
      'app.name': 'Mianix',
      'nav.characters': 'Nhân vật',
      'nav.llm_models': 'Models AI',
      'nav.presets': 'Lời nhắc',
      'llm_models.index.title': 'Quản lý LLM models',
      'llm_models.index.subtitle': 'Quản lý các Models AI được sử dụng',
      'llm_models.index.add': 'Thêm Model AI',
      'llm_models.index.edit': 'Sửa Model AI',
      'llm_models.index.delete': 'Xóa Model AI',
      'llm_models.index.default': 'Mặc định',
      'message.empty': 'Danh sách trống, hãy thêm mới.',
    },
  },
});