import { create } from 'zustand';
import type { AppState, ToastType, AudioSettings, SessionRecord, SubtitleEntry, RecognitionStatus } from '@/types';
import { generateId } from '@/utils/helpers';
import { DEFAULT_AUDIO_SETTINGS, TOAST_DURATION } from '@/utils/constants';

const STORAGE_KEY = 'subtitle-translator-session-records';
const CONTROL_STATE_KEY = 'subtitle-translator-control-state';

// 同一条内容在该时间窗口内不重复记录（用于恢复后去重）
const DUPLICATE_WINDOW_MS = 3000;
// 持久化的字幕条数上限
const MAX_PERSISTED_SUBTITLES = 200;

// 需要持久化的控制面板进度（暂停进度 + 已选语言 + 已识别内容）
interface PersistedControlState {
  recognitionStatus: RecognitionStatus;
  sourceLang: string;
  targetLang: string;
  subtitles: SubtitleEntry[];
  currentSubtitle: string;
}

const loadControlState = (): PersistedControlState | null => {
  try {
    const stored = localStorage.getItem(CONTROL_STATE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PersistedControlState;
      return {
        // 页面重新进入时无法直接恢复麦克风：识别中/已暂停都落到可恢复的暂停状态
        recognitionStatus: parsed.recognitionStatus === 'idle' ? 'idle' : 'paused',
        sourceLang: parsed.sourceLang || 'zh-CN',
        targetLang: parsed.targetLang || 'en-US',
        subtitles: Array.isArray(parsed.subtitles)
          ? parsed.subtitles.map(s => ({ ...s, timestamp: new Date(s.timestamp) }))
          : [],
        currentSubtitle: typeof parsed.currentSubtitle === 'string' ? parsed.currentSubtitle : '',
      };
    }
  } catch {
    console.error('Failed to load control state from storage');
  }
  return null;
};

const saveControlState = (state: PersistedControlState) => {
  try {
    localStorage.setItem(CONTROL_STATE_KEY, JSON.stringify({
      ...state,
      subtitles: state.subtitles.slice(-MAX_PERSISTED_SUBTITLES),
    }));
  } catch {
    console.error('Failed to save control state to storage');
  }
};

const persistedControlState = loadControlState();

const loadRecordsFromStorage = (): SessionRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((r: SessionRecord) => ({
        ...r,
        timestamp: new Date(r.timestamp),
      }));
    }
  } catch {
    console.error('Failed to load session records from storage');
  }
  return [];
};

const saveRecordsToStorage = (records: SessionRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    console.error('Failed to save session records to storage');
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  // 控制面板状态（从本地存储恢复暂停进度与已选语言）
  sourceLang: persistedControlState?.sourceLang ?? 'zh-CN',
  targetLang: persistedControlState?.targetLang ?? 'en-US',
  recognitionStatus: persistedControlState?.recognitionStatus ?? 'idle',
  audioSettings: DEFAULT_AUDIO_SETTINGS,

  // 字幕状态 - 恢复暂停时保留的已识别内容
  subtitles: persistedControlState?.subtitles ?? [],
  currentSubtitle: persistedControlState?.currentSubtitle ?? '',
  
  // 翻译状态
  inputText: '',
  translationHistory: [],
  isTranslating: false,
  
  // Toast状态
  toasts: [],
  
  // 会话记录
  sessionRecords: loadRecordsFromStorage(),
  
  // Actions
  setSourceLang: (lang: string) => {
    set({ sourceLang: lang });
    get().addToast('info', `源语言已切换`);
  },
  
  setTargetLang: (lang: string) => {
    set({ targetLang: lang });
    get().addToast('info', `目标语言已切换`);
  },
  
  startRecognition: () => {
    if (get().recognitionStatus !== 'idle') return;
    set({ recognitionStatus: 'listening' });
  },

  pauseRecognition: () => {
    if (get().recognitionStatus !== 'listening') return;
    // 暂停时保留已识别内容与当前语言设置，仅切换状态
    set({ recognitionStatus: 'paused' });
    get().addToast('info', '识别已暂停，进度已保留');
  },

  resumeRecognition: () => {
    if (get().recognitionStatus !== 'paused') return;
    // 从暂停位置继续，不清空字幕与语言设置
    set({ recognitionStatus: 'listening' });
    get().addToast('info', '已继续识别');
  },

  stopRecognition: () => {
    if (get().recognitionStatus === 'idle') return;
    set({ recognitionStatus: 'idle', currentSubtitle: '' });
  },

  markInterrupted: (reason?: string) => {
    if (get().recognitionStatus !== 'listening') return;
    // 识别被浏览器中断或网络异常时，回到可恢复的暂停状态
    set({ recognitionStatus: 'paused' });
    get().addToast('warning', reason || '识别已中断，点击继续可恢复');
  },
  
  setAudioSettings: (settings: Partial<AudioSettings>) => {
    set(state => ({
      audioSettings: { ...state.audioSettings, ...settings },
    }));
  },
  
  addSubtitle: (original: string, translated: string) => {
    const { sourceLang, targetLang } = get();
    const now = Date.now();

    // 恢复识别后浏览器可能重投暂停前的结果，同一条内容不重复记录
    const lastSubtitle = get().subtitles[get().subtitles.length - 1];
    if (
      lastSubtitle &&
      lastSubtitle.originalText === original &&
      now - lastSubtitle.timestamp.getTime() < DUPLICATE_WINDOW_MS
    ) {
      console.log('[字幕] 重复内容已忽略:', original);
      set({ currentSubtitle: '' });
      return;
    }

    set(state => ({
      subtitles: [
        ...state.subtitles.map(s => ({ ...s, isActive: false })),
        {
          id: generateId(),
          originalText: original,
          translatedText: translated,
          timestamp: new Date(),
          isActive: true,
        },
      ],
      currentSubtitle: '',
    }));
    get().addSessionRecord({
      type: 'voice',
      sourceText: original,
      targetText: translated,
      sourceLang,
      targetLang,
    });
  },
  
  setCurrentSubtitle: (text: string) => {
    set({ currentSubtitle: text });
  },
  
  setInputText: (text: string) => {
    set({ inputText: text });
  },
  
  translate: async () => {
    const { inputText, sourceLang, targetLang, addToast, addSessionRecord } = get();
    
    if (!inputText.trim()) {
      addToast('warning', '请输入要翻译的文本');
      return;
    }
    
    set({ isTranslating: true });
    
    try {
      // 模拟翻译
      await new Promise(resolve => setTimeout(resolve, 800));
      const result = `[Translated] ${inputText}`;
      
      set(state => ({
        translationHistory: [
          {
            id: generateId(),
            sourceText: inputText,
            targetText: result,
            sourceLang,
            targetLang,
            timestamp: new Date(),
          },
          ...state.translationHistory,
        ],
        inputText: '',
        isTranslating: false,
      }));
      
      addSessionRecord({
        type: 'manual',
        sourceText: inputText,
        targetText: result,
        sourceLang,
        targetLang,
      });
      
      addToast('success', '翻译完成');
    } catch {
      set({ isTranslating: false });
      addToast('error', '翻译失败，请重试');
    }
  },
  
  addToast: (type: ToastType, message: string) => {
    const id = generateId();
    set(state => ({
      toasts: [...state.toasts, { id, type, message, duration: TOAST_DURATION }],
    }));
    
    // 自动移除
    setTimeout(() => {
      get().removeToast(id);
    }, TOAST_DURATION);
  },
  
  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },
  
  addSessionRecord: (record) => {
    set(state => {
      const newRecord: SessionRecord = {
        id: generateId(),
        timestamp: new Date(),
        ...record,
      };
      const newRecords = [newRecord, ...state.sessionRecords];
      saveRecordsToStorage(newRecords);
      return { sessionRecords: newRecords };
    });
  },
  
  deleteSessionRecord: (id: string) => {
    set(state => {
      const newRecords = state.sessionRecords.filter(r => r.id !== id);
      saveRecordsToStorage(newRecords);
      return { sessionRecords: newRecords };
    });
    get().addToast('success', '记录已删除');
  },
  
  clearSessionRecords: () => {
    set({ sessionRecords: [] });
    saveRecordsToStorage([]);
    get().addToast('success', '所有记录已清空');
  },
}));

// 控制面板进度持久化：状态、语言或字幕变化时保存，
// 重新打开控制面板/再次进入页面时恢复到同一状态
useAppStore.subscribe((state, prev) => {
  if (
    state.recognitionStatus !== prev.recognitionStatus ||
    state.sourceLang !== prev.sourceLang ||
    state.targetLang !== prev.targetLang ||
    state.subtitles !== prev.subtitles ||
    state.currentSubtitle !== prev.currentSubtitle
  ) {
    saveControlState({
      recognitionStatus: state.recognitionStatus,
      sourceLang: state.sourceLang,
      targetLang: state.targetLang,
      subtitles: state.subtitles,
      currentSubtitle: state.currentSubtitle,
    });
  }
});
