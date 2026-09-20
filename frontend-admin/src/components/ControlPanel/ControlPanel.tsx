import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Gauge,
  Languages,
  Settings,
  AlertCircle,
  Play,
  Pause,
  Square,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Select, Slider, Toggle, Button } from '@/components/ui';
import { LANGUAGES, RECORDING_STATUS_META } from '@/utils/constants';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import type { RecordingStatus } from '@/types';

export const ControlPanel: React.FC = () => {
  const sourceLang = useAppStore(state => state.sourceLang);
  const targetLang = useAppStore(state => state.targetLang);
  const recordingStatus = useAppStore(state => state.recordingStatus);
  const audioSettings = useAppStore(state => state.audioSettings);
  const setSourceLang = useAppStore(state => state.setSourceLang);
  const setTargetLang = useAppStore(state => state.setTargetLang);
  const startRecognition = useAppStore(state => state.startRecognition);
  const pauseRecognition = useAppStore(state => state.pauseRecognition);
  const resumeRecognition = useAppStore(state => state.resumeRecognition);
  const stopRecognition = useAppStore(state => state.stopRecognition);
  const setAudioSettings = useAppStore(state => state.setAudioSettings);

  const { testSpeak, isSupported: ttsSupported } = useSpeechSynthesis();

  const languageOptions = LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.nativeName,
  }));

  // 检查浏览器是否支持语音识别
  const isSpeechSupported = typeof window !== 'undefined' &&
    (!!window.SpeechRecognition || !!(window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  const statusMeta = RECORDING_STATUS_META[recordingStatus];
  const isActive = recordingStatus !== 'idle';

  // 主按钮：待机时开始；识别中时暂停；暂停 / 中断后继续
  const handlePrimaryClick = () => {
    if (recordingStatus === 'idle') {
      startRecognition();
    } else if (recordingStatus === 'recording') {
      pauseRecognition();
    } else {
      resumeRecognition();
    }
  };

  const primaryIcon: Record<RecordingStatus, React.ReactNode> = {
    idle: <Mic className="w-6 h-6" />,
    recording: <Pause className="w-6 h-6" />,
    paused: <Play className="w-6 h-6" />,
    interrupted: <Play className="w-6 h-6" />,
  };

  const primaryButtonClass: Record<RecordingStatus, string> = {
    idle: 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30',
    recording: 'bg-accent-red/20 text-accent-red recording-indicator',
    paused: 'bg-accent-yellow/20 text-accent-yellow hover:bg-accent-yellow/30',
    interrupted: 'bg-accent-yellow/20 text-accent-yellow hover:bg-accent-yellow/30',
  };

  return (
    <aside className="w-full h-full flex-shrink-0 glass-panel rounded-2xl p-6 flex flex-col gap-6 overflow-y-auto">
      {/* 标题 */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="p-2 bg-primary-500/20 rounded-lg">
          <Settings className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-dark-100">控制面板</h2>
          <p className="text-xs text-dark-500">音频与语言设置</p>
        </div>
      </div>

      {/* 浏览器兼容性提示 */}
      {!isSpeechSupported && (
        <div className="flex items-start gap-2 p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
          <p className="text-xs text-dark-300">
            您的浏览器不支持语音识别，请使用 Edge 浏览器以获得完整体验
          </p>
        </div>
      )}

      {/* 麦克风控制 */}
      <section className="glass-card p-4 space-y-4">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <Mic className="w-4 h-4" />
          麦克风控制
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrimaryClick}
              disabled={!isSpeechSupported}
              className={`
                p-4 rounded-xl transition-all duration-300
                ${!isSpeechSupported
                  ? 'bg-dark-800 text-dark-600 cursor-not-allowed'
                  : primaryButtonClass[recordingStatus]
                }
              `}
              aria-label={statusMeta.label}
            >
              {primaryIcon[recordingStatus]}
            </button>
            <div>
              <p className="text-sm font-medium text-dark-200">
                {statusMeta.label}
              </p>
              <p className="text-xs text-dark-500">
                {isSpeechSupported ? statusMeta.panelHint : '当前浏览器不支持语音识别'}
              </p>
            </div>
          </div>
        </div>

        {/* 操作按钮组：暂停 / 继续为主操作，任何活动状态下都可完全停止 */}
        <div className="flex gap-2">
          {recordingStatus === 'idle' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={startRecognition}
              disabled={!isSpeechSupported}
              icon={<Play className="w-4 h-4" />}
              className="flex-1"
            >
              开始识别
            </Button>
          ) : recordingStatus === 'recording' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={pauseRecognition}
              icon={<Pause className="w-4 h-4" />}
              className="flex-1"
            >
              暂停
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={resumeRecognition}
              icon={<Play className="w-4 h-4" />}
              className="flex-1"
            >
              {recordingStatus === 'interrupted' ? '恢复识别' : '继续'}
            </Button>
          )}

          {isActive && (
            <Button
              variant="danger"
              size="sm"
              onClick={stopRecognition}
              icon={<Square className="w-3.5 h-3.5" />}
              className="flex-1"
            >
              停止
            </Button>
          )}
        </div>

        {!isActive && (
          <div className="flex items-center gap-2 text-xs text-dark-500">
            <MicOff className="w-3.5 h-3.5" />
            <span>麦克风已关闭，暂停 / 中断的进度在停止后才会清空</span>
          </div>
        )}
      </section>

      {/* 语言设置 */}
      <section className="glass-card p-4 space-y-4">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <Languages className="w-4 h-4" />
          语言设置
        </h3>

        <Select
          label="识别语言（源语言）"
          value={sourceLang}
          options={languageOptions}
          onChange={setSourceLang}
        />


        <Select
          label="翻译语言（目标语言）"
          value={targetLang}
          options={languageOptions}
          onChange={setTargetLang}
        />
      </section>

      {/* 音频设置 - TTS语音播报 */}
      <section className="glass-card p-4 space-y-5">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          语音播报设置
        </h3>

        <Toggle
          label="自动播放字幕翻译"
          checked={audioSettings.ttsEnabled}
          onChange={checked => setAudioSettings({ ttsEnabled: checked })}
          icon={<Volume2 className="w-4 h-4" />}
          activeColor="bg-primary-500"
        />

        <Slider
          label="音频设置"
          value={audioSettings.volume}
          min={0}
          max={100}
          unit="%"
          onChange={value => setAudioSettings({ volume: value })}
          icon={<Volume2 className="w-4 h-4" />}
        />

        <Slider
          label="播报语速"
          value={audioSettings.speed}
          min={0.5}
          max={2.0}
          step={0.1}
          unit="x"
          onChange={value => setAudioSettings({ speed: value })}
          icon={<Gauge className="w-4 h-4" />}
        />

        <Button
          variant="secondary"
          size="sm"
          onClick={testSpeak}
          disabled={!ttsSupported}
          icon={<Play className="w-4 h-4" />}
          className="w-full"
        >
          测试播报
        </Button>

        {!ttsSupported && (
          <p className="text-xs text-accent-yellow">
            您的浏览器不支持语音播报功能
          </p>
        )}
      </section>

      {/* 状态指示 */}
      <div className="mt-auto pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-dark-500">
          <span
            className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`}
          />
          <span>系统状态: {statusMeta.label}</span>
        </div>
      </div>
    </aside>
  );
};
