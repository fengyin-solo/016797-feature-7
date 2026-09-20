import type { Language, RecordingStatus } from '@/types';

export const LANGUAGES: Language[] = [
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
];

export const DEFAULT_AUDIO_SETTINGS = {
  volume: 80,
  speed: 1.0,
  ttsEnabled: true,
};

export const MAX_INPUT_LENGTH = 500;

export const TOAST_DURATION = 3000;

// 识别状态的统一展示元数据：控制面板与字幕区共用，保证状态指示与提示同步流转
export interface RecordingStatusMeta {
  /** 简短状态名 */
  label: string;
  /** 控制面板上的说明文字 */
  panelHint: string;
  /** 字幕区里的提示文字 */
  subtitleHint: string;
  /** 状态圆点颜色 */
  dotClass: string;
  /** 字幕区提示卡片的强调色（左边框 + 圆点 + 文案） */
  accentClass: string;
  /** 字幕区空状态引导文案 */
  emptyHint: string;
}

export const RECORDING_STATUS_META: Record<RecordingStatus, RecordingStatusMeta> = {
  idle: {
    label: '待机',
    panelHint: '点击开始录音',
    subtitleHint: '等待开始',
    dotClass: 'bg-dark-600',
    accentClass: 'border-dark-600',
    emptyHint: '开启麦克风开始识别语音',
  },
  recording: {
    label: '识别中',
    panelHint: '正在识别语音，可随时暂停',
    subtitleHint: '实时识别中',
    dotClass: 'bg-accent-green animate-pulse',
    accentClass: 'border-primary-500',
    emptyHint: '正在聆听，请开始说话…',
  },
  paused: {
    label: '已暂停',
    panelHint: '识别已暂停，点击继续接着识别',
    subtitleHint: '已暂停 · 点击继续后从当前位置接着识别',
    dotClass: 'bg-accent-yellow',
    accentClass: 'border-accent-yellow',
    emptyHint: '识别已暂停，继续后将接着往下识别',
  },
  interrupted: {
    label: '已中断',
    panelHint: '识别被浏览器或网络中断，点击继续恢复',
    subtitleHint: '识别已中断 · 点击继续恢复，已识别内容不会丢失',
    dotClass: 'bg-accent-red',
    accentClass: 'border-accent-red',
    emptyHint: '识别被中断，恢复后接着往下识别',
  },
};

// 模拟字幕数据
export const MOCK_SUBTITLES = [
  {
    original: '欢迎使用实时字幕翻译系统',
    translated: 'Welcome to the real-time subtitle translation system',
  },
  {
    original: '这是一个演示示例',
    translated: 'This is a demonstration example',
  },
  {
    original: '您可以通过左侧面板控制麦克风',
    translated: 'You can control the microphone through the left panel',
  },
  {
    original: '中央区域会显示识别的字幕内容',
    translated: 'The central area will display the recognized subtitle content',
  },
  {
    original: '右侧可以手动输入文本进行翻译',
    translated: 'You can manually enter text for translation on the right side',
  },
];
