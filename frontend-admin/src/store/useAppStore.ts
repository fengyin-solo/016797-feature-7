import { create } from 'zustand';
import type { AppState, ToastType, AudioSettings, SessionRecord, SubtitleEntry, RecordingStatus } from '@/types';
import { generateId } from '@/utils/helpers';
import { DEFAULT_AUDIO_SETTINGS, TOAST_DURATION } from '@/utils/constants';

const STORAGE_KEY = 'subtitle-translator-session-records';
// 识别进度（状态、语言、已识别字幕）持久化键：重新打开面板 / 再次进入页面时恢复同一份进度
const PROGRESS_STORAGE_KEY = 'subtitle-translator-recognition-progress';

// 同一句话在该时间窗内只记录一次（覆盖浏览器自动重启 / 中断恢复导致的重复 final 结果）
const DEDUP_WINDOW_MS = 10_000;
// 持久化最多保留的字幕条数，避免 localStorage 膨胀
const PERSISTED_SUBTITLE_LIMIT = 500;

interface PersistedProgress {
  version: 1;
  recordingStatus: RecordingStatus;
  sourceLang: string;
  targetLang: string;
  subtitles: SubtitleEntry[];
}

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

// 重新进入页面时：浏览器无法在无用户交互的情况下自行恢复麦克风，
// 因此上次的 recording 也归一为「可恢复的中间态」，由用户点击继续接着识别。
const loadProgressFromStorage = (): Partial<PersistedProgress> => {
  try {
    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as PersistedProgress;
    if (parsed.version !== 1) return {};

    const validStatuses: RecordingStatus[] = ['idle', 'recording', 'paused', 'interrupted'];
    const recordingStatus: RecordingStatus = validStatuses.includes(parsed.recordingStatus)
      ? parsed.recordingStatus === 'recording'
        ? 'interrupted'
        : parsed.recordingStatus
      : 'idle';

    return {
      recordingStatus,
      sourceLang: typeof parsed.sourceLang === 'string' ? parsed.sourceLang : undefined,
      targetLang: typeof parsed.targetLang === 'string' ? parsed.targetLang : undefined,
      // 暂停时尚未落定的临时文本不恢复（浏览器无法保证从同一点继续）
      subtitles: Array.isArray(parsed.subtitles)
        ? parsed.subtitles.map(s => ({ ...s, timestamp: new Date(s.timestamp) }))
        : [],
    };
  } catch {
    console.error('Failed to load recognition progress from storage');
    return {};
  }
};

const saveProgressToStorage = (progress: PersistedProgress) => {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    console.error('Failed to save recognition progress to storage');
  }
};

const clearProgressFromStorage = () => {
  try {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  } catch {
    // 忽略
  }
};

// 提交去重：归一化文本，保留最近一次同内容提交的时间
const normalizeText = (text: string): string =>
  text.trim().replace(/[.!?。！？\s]+$/g, '').toLowerCase();

const recentCommits: Array<{ key: string; time: number }> = [];

// 与最近 N 条已识别字幕比对：即使重启清空了内存去重表，也能挡住浏览器重新抛出的旧结果
const DEDUP_RECENT_SUBTITLES = 20;

const isDuplicateCommit = (original: string, recentSubtitles: SubtitleEntry[]): boolean => {
  const key = normalizeText(original);
  if (!key) return true;
  const now = Date.now();

  // 1) 时间窗内的内存去重（覆盖同页面内自动重启导致的重复）
  while (recentCommits.length && now - recentCommits[0].time > DEDUP_WINDOW_MS) {
    recentCommits.shift();
  }
  if (recentCommits.some(c => c.key === key)) {
    return true;
  }

  // 2) 与最近已记录字幕比对（覆盖中断恢复 / 重新进入页面后的重复）
  const tail = recentSubtitles.slice(-DEDUP_RECENT_SUBTITLES);
  if (tail.some(s => normalizeText(s.originalText) === key)) {
    return true;
  }

  recentCommits.push({ key, time: now });
  return false;
};

const persistedProgress = loadProgressFromStorage();

export const useAppStore = create<AppState>((set, get) => ({
  // 控制面板状态
  sourceLang: persistedProgress.sourceLang ?? 'zh-CN',
  targetLang: persistedProgress.targetLang ?? 'en-US',
  recordingStatus: persistedProgress.recordingStatus ?? 'idle',
  audioSettings: DEFAULT_AUDIO_SETTINGS,

  // 字幕状态 - 恢复暂停 / 中断前已识别的内容
  subtitles: persistedProgress.subtitles ?? [],
  currentSubtitle: '',

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
    if (lang === get().sourceLang) return;
    set({ sourceLang: lang });
    get().addToast('info', `源语言已切换`);
  },

  setTargetLang: (lang: string) => {
    if (lang === get().targetLang) return;
    set({ targetLang: lang });
    get().addToast('info', `目标语言已切换`);
  },

  // 开始识别：只在完全停止（idle）状态下可用
  startRecognition: () => {
    if (get().recordingStatus === 'recording') return;
    set({ recordingStatus: 'recording' });
  },

  // 暂停：保留已识别内容、当前语言与句中临时文本，识别从暂停位置继续
  pauseRecognition: () => {
    if (get().recordingStatus !== 'recording') return;
    set({ recordingStatus: 'paused' });
    get().addToast('info', '识别已暂停');
  },

  // 继续：暂停或被中断后，从当前进度接着识别
  resumeRecognition: () => {
    const { recordingStatus } = get();
    if (recordingStatus !== 'paused' && recordingStatus !== 'interrupted') return;
    set({ recordingStatus: 'recording' });
    get().addToast('success', '继续识别');
  },

  // 完全停止：结束本次会话并清空进度
  stopRecognition: () => {
    if (get().recordingStatus === 'idle') return;
    recentCommits.length = 0;
    set({ recordingStatus: 'idle', currentSubtitle: '' });
  },

  // 浏览器 / 网络异常：进入可恢复的中间状态，已识别内容原样保留
  markRecognitionInterrupted: (reason: string) => {
    if (get().recordingStatus !== 'recording') return;
    set({ recordingStatus: 'interrupted', currentSubtitle: '' });
    get().addToast('warning', `识别已中断（${reason}），点击继续恢复`);
  },

  setAudioSettings: (settings: Partial<AudioSettings>) => {
    set(state => ({
      audioSettings: { ...state.audioSettings, ...settings },
    }));
  },

  addSubtitle: (original: string, translated: string) => {
    const { sourceLang, targetLang, subtitles } = get();

    // 浏览器自动重启 / 中断恢复 / 重新进入页面都可能把同一条 final 结果再次抛出，统一兜底去重
    if (isDuplicateCommit(original, subtitles)) {
      set({ currentSubtitle: '' });
      return false;
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
    return true;
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

// 持久化识别进度：暂停的进度与已选语言在重新打开面板 / 再次进入页面时保持同一状态
useAppStore.subscribe((state, prevState) => {
  if (
    state.recordingStatus === prevState.recordingStatus &&
    state.sourceLang === prevState.sourceLang &&
    state.targetLang === prevState.targetLang &&
    state.subtitles === prevState.subtitles
  ) {
    return;
  }

  if (state.recordingStatus === 'idle') {
    clearProgressFromStorage();
    return;
  }

  saveProgressToStorage({
    version: 1,
    recordingStatus: state.recordingStatus,
    sourceLang: state.sourceLang,
    targetLang: state.targetLang,
    subtitles: state.subtitles.slice(-PERSISTED_SUBTITLE_LIMIT),
  });
});
