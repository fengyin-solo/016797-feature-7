// 语言类型
export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// 字幕条目
export interface SubtitleEntry {
  id: string;
  originalText: string;
  translatedText: string;
  timestamp: Date;
  isActive: boolean;
}

// 翻译结果
export interface TranslationResult {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: Date;
}

// 识别状态
// idle: 未开始 / 已停止；recording: 识别中；paused: 用户主动暂停；interrupted: 被浏览器或网络中断（可恢复）
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'interrupted';

// 音频设置
export interface AudioSettings {
  volume: number;
  speed: number;
  ttsEnabled: boolean;
}

// 控制面板状态
export interface ControlPanelState {
  sourceLang: string;
  targetLang: string;
  recordingStatus: RecordingStatus;
  audioSettings: AudioSettings;
}

// Toast 类型
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// 会话记录类型
export type SessionRecordType = 'voice' | 'manual';

// 会话记录条目
export interface SessionRecord {
  id: string;
  type: SessionRecordType;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    duration?: number;
  };
}

// 应用状态
export interface AppState {
  // 控制面板
  sourceLang: string;
  targetLang: string;
  recordingStatus: RecordingStatus;
  audioSettings: AudioSettings;
  
  // 字幕
  subtitles: SubtitleEntry[];
  currentSubtitle: string;
  
  // 翻译
  inputText: string;
  translationHistory: TranslationResult[];
  isTranslating: boolean;
  
  // Toast
  toasts: Toast[];
  
  // 会话记录
  sessionRecords: SessionRecord[];
  
  // Actions
  setSourceLang: (lang: string) => void;
  setTargetLang: (lang: string) => void;
  // 识别控制：开始 / 暂停 / 继续 / 完全停止 / 标记为被中断
  startRecognition: () => void;
  pauseRecognition: () => void;
  resumeRecognition: () => void;
  stopRecognition: () => void;
  markRecognitionInterrupted: (reason: string) => void;
  setAudioSettings: (settings: Partial<AudioSettings>) => void;
  /** 追加一条已完成字幕；与最近记录内容相同则忽略，返回是否真正写入 */
  addSubtitle: (original: string, translated: string) => boolean;
  setCurrentSubtitle: (text: string) => void;
  setInputText: (text: string) => void;
  translate: () => Promise<void>;
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
  addSessionRecord: (record: Omit<SessionRecord, 'id' | 'timestamp'>) => void;
  deleteSessionRecord: (id: string) => void;
  clearSessionRecords: () => void;
}
