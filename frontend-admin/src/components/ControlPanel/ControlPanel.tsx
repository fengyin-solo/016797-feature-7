import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Gauge,
  Activity,
  Languages,
  Settings,
  AlertCircle,
  Play,
  Pause,
  Square,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Select, Slider, Toggle, Button } from '@/components/ui';
import { LANGUAGES } from '@/utils/constants';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

export const ControlPanel: React.FC = () => {
  const sourceLang = useAppStore(state => state.sourceLang);
  const targetLang = useAppStore(state => state.targetLang);
  const recognitionStatus = useAppStore(state => state.recognitionStatus);
  const audioSettings = useAppStore(state => state.audioSettings);
  const setSourceLang = useAppStore(state => state.setSourceLang);
  const setTargetLang = useAppStore(state => state.setTargetLang);
  const startRecognition = useAppStore(state => state.startRecognition);
  const pauseRecognition = useAppStore(state => state.pauseRecognition);
  const resumeRecognition = useAppStore(state => state.resumeRecognition);
  const stopRecognition = useAppStore(state => state.stopRecognition);
  const setAudioSettings = useAppStore(state => state.setAudioSettings);

  const { testSpeak, isSupported: ttsSupported } = useSpeechSynthesis();

  const isIdle = recognitionStatus === 'idle';
  const isListening = recognitionStatus === 'listening';
  const isPaused = recognitionStatus === 'paused';

  const languageOptions = LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.nativeName,
  }));

  // 检查浏览器是否支持语音识别
  const isSpeechSupported = typeof window !== 'undefined' &&
    (!!window.SpeechRecognition || !!(window as typeof window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  // 主按钮：开始 / 暂停 / 继续
  const handleMainAction = () => {
    if (isIdle) {
      startRecognition();
    } else if (isListening) {
      pauseRecognition();
    } else {
      resumeRecognition();
    }
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
              onClick={handleMainAction}
              disabled={!isSpeechSupported}
              className={`
                p-4 rounded-xl transition-all duration-300
                ${!isSpeechSupported
                  ? 'bg-dark-800 text-dark-600 cursor-not-allowed'
                  : isListening
                    ? 'bg-accent-yellow/20 text-accent-yellow recording-indicator'
                    : isPaused
                      ? 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30'
                      : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                }
              `}
            >
              {isListening ? (
                <Pause className="w-6 h-6" />
              ) : isPaused ? (
                <Play className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </button>
            {!isIdle && (
              <button
                onClick={stopRecognition}
                title="停止识别"
                className="p-4 rounded-xl transition-all duration-300 bg-accent-red/20 text-accent-red hover:bg-accent-red/30"
              >
                <Square className="w-6 h-6" />
              </button>
            )}
            <div>
              <p className="text-sm font-medium text-dark-200">
                {isListening ? '录音中' : isPaused ? '已暂停' : '已关闭'}
              </p>
              <p className="text-xs text-dark-500">
                {isListening
                  ? '正在识别语音...'
                  : isPaused
                    ? '进度已保留，点击继续'
                    : '点击开始录音'}
              </p>
            </div>
          </div>
        </div>

        <Toggle
          label="自动识别"
          checked={!isIdle}
          onChange={checked => (checked ? startRecognition() : stopRecognition())}
          icon={<Activity className="w-4 h-4" />}
          activeColor="bg-accent-red"
        />
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
          disabled={isPaused}
        />


        <Select
          label="翻译语言（目标语言）"
          value={targetLang}
          options={languageOptions}
          onChange={setTargetLang}
          disabled={isPaused}
        />
        {isPaused && (
          <p className="text-xs text-dark-500">
            暂停中，语言设置已保留，继续识别后生效
          </p>
        )}
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
          icon={<Activity className="w-4 h-4" />}
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
            className={`w-2 h-2 rounded-full ${
              isListening
                ? 'bg-accent-green animate-pulse'
                : isPaused
                  ? 'bg-accent-yellow'
                  : 'bg-dark-600'
            }`}
          />
          <span>
            系统状态: {isListening ? '运行中' : isPaused ? '已暂停' : '待机'}
          </span>
        </div>
      </div>
    </aside>
  );
};
