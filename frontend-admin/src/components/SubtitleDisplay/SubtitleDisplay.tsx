import React, { useEffect, useRef } from 'react';
import { Subtitles, Clock, PauseCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime } from '@/utils/helpers';
import { SubtitleItem } from './SubtitleItem';

export const SubtitleDisplay: React.FC = () => {
  const subtitles = useAppStore(state => state.subtitles);
  const currentSubtitle = useAppStore(state => state.currentSubtitle);
  const recognitionStatus = useAppStore(state => state.recognitionStatus);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isListening = recognitionStatus === 'listening';
  const isPaused = recognitionStatus === 'paused';

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [subtitles, currentSubtitle]);

  return (
    <main className="flex-1 flex flex-col min-w-0 min-h-0 glass-panel rounded-2xl">
      {/* 标题栏 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-dark-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 rounded-lg">
            <Subtitles className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-dark-100">实时字幕</h2>
            <p className="text-xs text-dark-500">中英双语对照显示</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-dark-500">
          <Clock className="w-4 h-4" />
          <span>{formatTime(new Date())}</span>
        </div>
      </header>

      {/* 字幕内容区 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
      >
        {/* 暂停提示条：与控制面板状态同步流转 */}
        {isPaused && (
          <div className="flex items-center gap-2 p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-lg">
            <PauseCircle className="w-5 h-5 text-accent-yellow flex-shrink-0" />
            <p className="text-xs text-dark-300">
              识别已暂停，已识别内容与语言设置已保留，点击控制面板的继续按钮恢复
            </p>
          </div>
        )}
        {subtitles.length === 0 && !currentSubtitle ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            {isPaused ? (
              <PauseCircle className="w-16 h-16 mb-4 opacity-30" />
            ) : (
              <Subtitles className="w-16 h-16 mb-4 opacity-30" />
            )}
            <p className="text-lg">{isPaused ? '识别已暂停' : '暂无字幕内容'}</p>
            <p className="text-sm mt-2">
              {isPaused ? '点击控制面板的继续按钮恢复识别' : '开启麦克风开始识别语音'}
            </p>
          </div>
        ) : (
          <>
            {/* 历史字幕 */}
            {subtitles.map(subtitle => (
              <SubtitleItem key={subtitle.id} subtitle={subtitle} />
            ))}

            {/* 当前正在识别的内容 */}
            {currentSubtitle && (
              <div className="glass-card p-4 border-l-4 border-primary-500 animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-dark-100 text-lg typing-cursor">
                      {currentSubtitle}
                    </p>
                    <p className="text-dark-500 text-sm mt-2 italic">
                      正在识别...
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部状态栏 */}
      <footer className="px-6 py-3 border-t border-white/10 bg-dark-900/50">
        <div className="flex items-center justify-between text-xs text-dark-500">
          <span>共 {subtitles.length} 条字幕</span>
          <div className="flex items-center gap-2">
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
              {isListening ? '实时识别中' : isPaused ? '已暂停' : '等待开始'}
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
};
