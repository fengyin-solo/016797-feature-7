import React, { useEffect, useRef } from 'react';
import { Subtitles, Clock, Pause, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime } from '@/utils/helpers';
import { RECORDING_STATUS_META } from '@/utils/constants';
import { SubtitleItem } from './SubtitleItem';

export const SubtitleDisplay: React.FC = () => {
  const subtitles = useAppStore(state => state.subtitles);
  const currentSubtitle = useAppStore(state => state.currentSubtitle);
  const recordingStatus = useAppStore(state => state.recordingStatus);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [subtitles, currentSubtitle, recordingStatus]);

  const statusMeta = RECORDING_STATUS_META[recordingStatus];

  const statusNode = (() => {
    if (recordingStatus === 'recording') {
      return (
        <>
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span>{statusMeta.subtitleHint}</span>
        </>
      );
    }
    if (recordingStatus === 'paused') {
      return (
        <>
          <Pause className="w-3.5 h-3.5 text-accent-yellow" />
          <span className="text-accent-yellow">{statusMeta.subtitleHint}</span>
        </>
      );
    }
    if (recordingStatus === 'interrupted') {
      return (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-accent-red" />
          <span className="text-accent-red">{statusMeta.subtitleHint}</span>
        </>
      );
    }
    return (
      <>
        <span className="w-2 h-2 rounded-full bg-dark-600" />
        <span>{statusMeta.subtitleHint}</span>
      </>
    );
  })();

  // 暂停 / 中断时显示在字幕列表底部的状态提示卡片
  const showStatusNotice = recordingStatus === 'paused' || recordingStatus === 'interrupted';

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
        {subtitles.length === 0 && !currentSubtitle && !showStatusNotice ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <Subtitles className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">暂无字幕内容</p>
            <p className="text-sm mt-2">{statusMeta.emptyHint}</p>
          </div>
        ) : (
          <>
            {/* 历史字幕：暂停 / 中断时全部保留 */}
            {subtitles.map(subtitle => (
              <SubtitleItem key={subtitle.id} subtitle={subtitle} />
            ))}

            {/* 当前正在识别的内容 */}
            {currentSubtitle && (
              <div
                className={`glass-card p-4 border-l-4 animate-fade-in ${
                  recordingStatus === 'paused'
                    ? 'border-accent-yellow'
                    : 'border-primary-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 mt-2 rounded-full ${
                      recordingStatus === 'paused'
                        ? 'bg-accent-yellow'
                        : 'bg-primary-500 animate-pulse'
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`text-dark-100 text-lg ${
                        recordingStatus === 'recording' ? 'typing-cursor' : ''
                      }`}
                    >
                      {currentSubtitle}
                    </p>
                    <p
                      className={`text-sm mt-2 italic ${
                        recordingStatus === 'paused' ? 'text-accent-yellow' : 'text-dark-500'
                      }`}
                    >
                      {recordingStatus === 'paused' ? '已暂停 · 继续后接着识别' : '正在识别...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 暂停 / 中断提示：与控制面板状态同步 */}
            {showStatusNotice && (
              <div
                className={`glass-card p-4 border-l-4 animate-fade-in flex items-start gap-3 ${
                  recordingStatus === 'interrupted'
                    ? 'border-accent-red'
                    : 'border-accent-yellow'
                }`}
              >
                {recordingStatus === 'interrupted' ? (
                  <AlertTriangle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
                ) : (
                  <Pause className="w-5 h-5 text-accent-yellow flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      recordingStatus === 'interrupted'
                        ? 'text-accent-red'
                        : 'text-accent-yellow'
                    }`}
                  >
                    {statusMeta.label}
                  </p>
                  <p className="text-dark-400 text-sm mt-1">
                    {recordingStatus === 'interrupted'
                      ? '浏览器或网络异常导致识别中断，已识别内容已保留。'
                      : '识别已暂停，已识别内容与语言设置均已保留。'}
                    在左侧控制面板点击「{recordingStatus === 'interrupted' ? '恢复识别' : '继续'}」即可接着往下识别。
                  </p>
                </div>
              </div>
            )}

            {/* 识别中但还没有任何内容时的聆听提示 */}
            {recordingStatus === 'recording' && subtitles.length === 0 && !currentSubtitle && (
              <div className="flex flex-col items-center justify-center py-10 text-dark-500">
                <Loader2 className="w-8 h-8 mb-3 animate-spin text-primary-400" />
                <p className="text-sm">{statusMeta.emptyHint}</p>
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
            {statusNode}
          </div>
        </div>
      </footer>
    </main>
  );
};
