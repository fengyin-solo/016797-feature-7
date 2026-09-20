import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

// TTS 播报函数
const speakText = (text: string, lang: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  const settings = useAppStore.getState().audioSettings;
  if (!settings.ttsEnabled) {
    return;
  }

  // 取消之前的播报
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // 获取合适的语音
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices[0];
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  utterance.volume = settings.volume / 100;
  utterance.rate = settings.speed;

  console.log('[TTS] 即时播报:', text);
  window.speechSynthesis.speak(utterance);
};

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onnomatch: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const translateText = (text: string, sourceLang: string, targetLang: string): string => {
  console.log('[翻译] 源语言:', sourceLang, '目标语言:', targetLang, '文本:', text);

  // 英文→中文
  if (sourceLang.startsWith('en') && targetLang.startsWith('zh')) {
    const enToCn: Record<string, string> = {
      'hello': '你好',
      'good morning': '早上好',
      'good evening': '晚上好',
      'good night': '晚安',
      'thank you': '谢谢',
      'thanks': '谢谢',
      'sorry': '对不起',
      'goodbye': '再见',
      'bye': '再见',
      'yes': '是的',
      'no': '不是',
      'ok': '好的',
      'please': '请',
      'welcome': '欢迎',
      'how are you': '你好吗',
      'i love you': '我爱你',
      'good afternoon': '下午好',
    };

    const lowerText = text.toLowerCase().trim().replace(/[.!?。！？]+$/, '');

    // 先尝试完整匹配
    if (enToCn[lowerText]) {
      return enToCn[lowerText];
    }

    // 尝试部分匹配替换
    let result = text;
    Object.entries(enToCn).forEach(([en, cn]) => {
      const regex = new RegExp(`\\b${en}\\b`, 'gi');
      result = result.replace(regex, cn);
    });

    if (result !== text) {
      return result;
    }

    return `[待翻译] ${text}`;
  }

  // 中文→英文
  if (sourceLang.startsWith('zh') && targetLang.startsWith('en')) {
    const cnToEn: Record<string, string> = {
      '你好': 'Hello',
      '早上好': 'Good morning',
      '晚上好': 'Good evening',
      '晚安': 'Good night',
      '下午好': 'Good afternoon',
      '谢谢': 'Thank you',
      '对不起': 'Sorry',
      '再见': 'Goodbye',
      '是的': 'Yes',
      '不是': 'No',
      '好的': 'OK',
      '请': 'Please',
      '欢迎': 'Welcome',
      '你好吗': 'How are you',
      '我爱你': 'I love you',
    };

    const trimmedText = text.trim().replace(/[.!?。！？]+$/, '');

    // 先尝试完整匹配
    if (cnToEn[trimmedText]) {
      return cnToEn[trimmedText];
    }

    // 尝试部分匹配替换
    let result = text;
    Object.entries(cnToEn).forEach(([cn, en]) => {
      result = result.replace(new RegExp(cn, 'g'), en);
    });

    if (result !== text) {
      return result;
    }

    return `[Translation] ${text}`;
  }

  return text;
};

// 检测文本是否主要是指定语言
const isTextInLanguage = (text: string, lang: string): boolean => {
  const trimmedText = text.trim();
  if (!trimmedText) return false;

  // 中文字符正则
  const chineseRegex = /[一-龥]/g;
  // 英文字母正则
  const englishRegex = /[a-zA-Z]/g;

  const chineseMatches = trimmedText.match(chineseRegex) || [];
  const englishMatches = trimmedText.match(englishRegex) || [];

  const chineseCount = chineseMatches.length;
  const englishCount = englishMatches.length;

  console.log(`[语言检测] 文本: "${trimmedText}"`);
  console.log(`[语言检测] 中文字符: ${chineseCount}, 英文字符: ${englishCount}`);
  console.log(`[语言检测] 期望语言: ${lang}`);

  if (lang.startsWith('zh')) {
    // 源语言是中文：必须包含中文字符，且中文字符数量要大于0
    const isValid = chineseCount > 0;
    console.log(`[语言检测] 中文检测结果: ${isValid ? '✅ 通过' : '❌ 不通过（无中文字符）'}`);
    return isValid;
  }

  if (lang.startsWith('en')) {
    // 源语言是英文：不能包含中文字符，且必须有英文字符
    const isValid = chineseCount === 0 && englishCount > 0;
    console.log(`[语言检测] 英文检测结果: ${isValid ? '✅ 通过' : '❌ 不通过'}`);
    return isValid;
  }

  return true;
};

const getSpeechRecognitionAPI = (): (new () => SpeechRecognition) | null => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const useSpeechRecognition = () => {
  useEffect(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionAPI();
    if (!SpeechRecognitionAPI) {
      // 若持久化了一个识别中的状态，浏览器不支持时回退到待机，避免卡在中间态
      const { recordingStatus, addToast } = useAppStore.getState();
      if (recordingStatus !== 'idle') {
        useAppStore.setState({ recordingStatus: 'idle', currentSubtitle: '' });
      }
      const unsubscribe = useAppStore.subscribe(state => {
        if (state.recordingStatus === 'recording') {
          addToast('error', '浏览器不支持语音识别');
          useAppStore.setState({ recordingStatus: 'idle', currentSubtitle: '' });
        }
      });
      return unsubscribe;
    }

    const recognitionRef: { current: SpeechRecognition | null } = { current: null };
    const shouldRestartRef = { current: false };
    const speechDetectedRef = { current: false };
    const resultReceivedRef = { current: false };
    const restartAttemptsRef = { current: 0 };
    const restartTimerRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
    // 主动 abort（语言切换 / 停止）期间，忽略随后触发的 onend，避免误判为中断
    const skipEndRef = { current: false };
    // 当前识别实例使用的识别语言；暂停期间切换语言后，继续时据此判断是否重建实例
    const instanceLangRef = { current: '' };
    // 引擎是否真正处于监听中（onstart / onend 之间），用于避免重复 start
    const activeRef = { current: false };
    // 暂停动作已发出、等 onend 落定期间到达的 final 结果仍然需要提交
    let stopping = false;

    const clearRestartTimer = () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    };

    const createRecognition = (): SpeechRecognition => {
      const { sourceLang } = useAppStore.getState();
      const recognition = new SpeechRecognitionAPI!();

      recognition.continuous = false; // 每说完一句自动结束，再由 onend 接续下一句
      recognition.interimResults = true;
      recognition.lang = sourceLang;
      recognition.maxAlternatives = 1;

      console.log('[语音识别] 创建实例:', { lang: sourceLang });

      recognition.onstart = () => {
        stopping = false;
        skipEndRef.current = false;
        activeRef.current = true;
        restartAttemptsRef.current = 0;
        console.log('[语音识别] ✅ 已启动');
      };

      recognition.onaudiostart = () => {
        console.log('[语音识别] 🎤 音频开始');
      };

      recognition.onsoundstart = () => {
        console.log('[语音识别] 🔊 检测到声音');
      };

      recognition.onspeechstart = () => {
        console.log('[语音识别] 🗣️ 检测到语音');
        speechDetectedRef.current = true;
      };

      recognition.onspeechend = () => {
        console.log('[语音识别] 🗣️ 语音结束');
      };

      recognition.onnomatch = () => {
        console.log('[语音识别] ❓ 无法识别');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        resultReceivedRef.current = true;
        console.log('[语音识别] 📝 ===== 收到结果 =====');

        const store = useAppStore.getState();
        const currentSourceLang = store.sourceLang;
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          console.log(`[语音识别] [${i}] "${text}" isFinal=${result.isFinal}`);

          if (result.isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }

        if (interim && !stopping) {
          console.log('[语音识别] 临时:', interim);
          store.setCurrentSubtitle(interim);
        }

        if (final.trim()) {
          // 检查识别结果是否符合源语言
          if (!isTextInLanguage(final, currentSourceLang)) {
            console.log('[语音识别] ⚠️ 语言不匹配，已忽略:', final);
            console.log('[语音识别] 期望语言:', currentSourceLang);
            store.setCurrentSubtitle('');
            store.addToast('warning', '请使用设置的源语言说话');
            return;
          }

          console.log('[语音识别] ✅ 最终:', final);
          const translated = translateText(final, currentSourceLang, store.targetLang);
          // addSubtitle 内部带去重：同一句话不会因为重启 / 恢复被重复记录
          const committed = store.addSubtitle(final, translated);

          if (committed) {
            // 立即播报翻译结果
            speakText(translated, store.targetLang);
          } else {
            console.log('[语音识别] ♻️ 重复内容，已跳过');
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[语音识别] ❌ 错误:', event.error);

        const { recordingStatus, addToast } = useAppStore.getState();

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          shouldRestartRef.current = false;
          addToast('error', '请允许麦克风权限');
          if (recordingStatus === 'recording') {
            useAppStore.getState().markRecognitionInterrupted('麦克风权限被拒绝');
          }
        } else if (event.error === 'no-speech') {
          // 正常现象，交由 onend 自动重启
          console.log('[语音识别] 未检测到语音');
        } else if (event.error === 'network') {
          shouldRestartRef.current = false;
          addToast('warning', '网络异常，语音识别已暂停');
          if (recordingStatus === 'recording') {
            useAppStore.getState().markRecognitionInterrupted('网络异常');
          }
        } else if (event.error === 'aborted') {
          // 主动暂停 / 停止 / 切换语言导致，忽略
          console.log('[语音识别] 已主动中止');
        } else if (event.error === 'audio-capture') {
          shouldRestartRef.current = false;
          if (recordingStatus === 'recording') {
            useAppStore.getState().markRecognitionInterrupted('麦克风设备异常');
          }
        } else {
          // 其他错误交给 onend 判断是否重启
          console.log('[语音识别] 其他错误，等待 onend');
        }
      };

      recognition.onend = () => {
        activeRef.current = false;
        console.log('[语音识别] 🔚 结束');

        // 主动 abort（停止 / 切换语言）：不做任何状态流转
        if (skipEndRef.current) {
          skipEndRef.current = false;
          return;
        }

        const status = useAppStore.getState().recordingStatus;

        // 暂停：保留已识别内容与临时文本，停在这里等待继续
        if (status === 'paused') {
          shouldRestartRef.current = false;
          console.log('[语音识别] ⏸️ 已暂停，停止自动重启');
          return;
        }

        // 完全停止
        if (status === 'idle') {
          shouldRestartRef.current = false;
          speechDetectedRef.current = false;
          resultReceivedRef.current = false;
          return;
        }

        // 被中断（网络错误等已经直接改状态）：不重启
        if (status === 'interrupted') {
          shouldRestartRef.current = false;
          return;
        }

        // 识别中：检测到语音但没有结果，可能是网络问题，进入可恢复状态
        if (speechDetectedRef.current && !resultReceivedRef.current) {
          console.log('[语音识别] ⚠️ 检测到语音但无结果，可能是网络问题');
          shouldRestartRef.current = false;
          useAppStore.getState().markRecognitionInterrupted('语音无法识别，请检查网络');
          return;
        }

        // 重置每轮标记
        speechDetectedRef.current = false;
        resultReceivedRef.current = false;

        // 自动重启，接续下一句
        if (shouldRestartRef.current) {
          clearRestartTimer();
          restartTimerRef.current = setTimeout(() => {
            if (
              !shouldRestartRef.current ||
              !recognitionRef.current ||
              useAppStore.getState().recordingStatus !== 'recording'
            ) {
              return;
            }
            try {
              console.log('[语音识别] 🔄 重启...');
              recognitionRef.current.start();
            } catch (e) {
              restartAttemptsRef.current += 1;
              console.error('[语音识别] 重启失败:', e);
              // 浏览器可能在后台拒绝重启（切标签页等），连续失败则转入可恢复的中间态
              if (restartAttemptsRef.current >= 2) {
                shouldRestartRef.current = false;
                useAppStore.getState().markRecognitionInterrupted('浏览器中止了识别');
              }
            }
          }, 300);
        }
      };

      return recognition;
    };

    // 启动一轮识别，实例语言与当前源语言不一致（含暂停期间切换语言）时自动重建
    const startSession = () => {
      clearRestartTimer();
      shouldRestartRef.current = true;
      stopping = false;
      speechDetectedRef.current = false;
      resultReceivedRef.current = false;

      const { sourceLang } = useAppStore.getState();
      if (recognitionRef.current && instanceLangRef.current !== sourceLang) {
        console.log('[语音识别] 🌐 识别语言已变更，重建实例:', sourceLang);
        skipEndRef.current = true;
        try {
          recognitionRef.current.abort();
        } catch {
          // 忽略
        }
        recognitionRef.current = null;
      }

      if (!recognitionRef.current) {
        recognitionRef.current = createRecognition();
        instanceLangRef.current = sourceLang;
      }

      const tryStart = (attempt: number) => {
        try {
          recognitionRef.current!.start();
          console.log('[语音识别] 🚀 启动成功');
        } catch (e) {
          console.error('[语音识别] 启动失败:', e);
          if (attempt === 0) {
            // 旧实例状态异常，重建后再试一次
            recognitionRef.current = createRecognition();
            instanceLangRef.current = useAppStore.getState().sourceLang;
            tryStart(1);
          } else {
            shouldRestartRef.current = false;
            useAppStore.getState().markRecognitionInterrupted('无法启动麦克风');
          }
        }
      };
      tryStart(0);
    };

    // 优雅暂停：stop() 允许引擎吐出当前这句话的 final 结果，不会丢内容
    const pauseSession = () => {
      clearRestartTimer();
      shouldRestartRef.current = false;
      stopping = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log('[语音识别] ⏸️ 请求暂停');
        } catch (e) {
          console.error('[语音识别] 暂停失败:', e);
        }
      }
    };

    // 完全停止：丢弃当前句的中间结果
    const stopSession = () => {
      clearRestartTimer();
      shouldRestartRef.current = false;
      stopping = true;
      if (recognitionRef.current) {
        skipEndRef.current = true;
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error('[语音识别] 停止失败:', e);
        }
        recognitionRef.current = null;
        instanceLangRef.current = '';
      }
      useAppStore.getState().setCurrentSubtitle('');
      console.log('[语音识别] 🛑 已停止');
    };

    // 跟随 store 中的识别状态流转
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (state.recordingStatus === prevState.recordingStatus) return;

      console.log('[语音识别] 状态流转:', prevState.recordingStatus, '→', state.recordingStatus);

      switch (state.recordingStatus) {
        case 'recording':
          // 继续 / 恢复时清掉暂停期间保留的旧临时文本；startSession 内部会处理语言变更后的实例重建
          if (prevState.recordingStatus === 'paused' || prevState.recordingStatus === 'interrupted') {
            useAppStore.getState().setCurrentSubtitle('');
          }
          startSession();
          break;
        case 'paused':
          pauseSession();
          break;
        case 'idle':
          stopSession();
          break;
        case 'interrupted':
          // 网络 / 浏览器错误：停止自动重启，保留现场等待用户继续
          clearRestartTimer();
          shouldRestartRef.current = false;
          stopping = true;
          if (recognitionRef.current) {
            skipEndRef.current = true;
            try {
              recognitionRef.current.abort();
            } catch {
              // 忽略
            }
          }
          break;
      }
    });

    // 切换识别语言：识别中需要以新语言重启，暂停 / 中断 / 待机则等继续或开始时自然生效
    const unsubscribeLang = useAppStore.subscribe((state, prevState) => {
      if (
        state.sourceLang === prevState.sourceLang ||
        state.recordingStatus !== 'recording'
      ) {
        return;
      }
      console.log('[语音识别] 🌐 识别语言切换，重启实例:', state.sourceLang);
      skipEndRef.current = true;
      clearRestartTimer();
      try {
        recognitionRef.current?.abort();
      } catch {
        // 忽略
      }
      recognitionRef.current = null;
      startSession();
    });

    // 标签页从后台切回时（浏览器常在此场景中断识别）：识别中且引擎已停才接续
    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        !activeRef.current &&
        useAppStore.getState().recordingStatus === 'recording'
      ) {
        startSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 初始化：恢复到 recording 已在 loadProgress 时归一为 interrupted；
    // 只有 recording 才直接拉起麦克风（首次进入页面时为 idle，不做任何事）
    if (useAppStore.getState().recordingStatus === 'recording') {
      startSession();
    }

    return () => {
      unsubscribe();
      unsubscribeLang();
      document.removeEventListener('visibilitychange', handleVisibility);
      clearRestartTimer();
      shouldRestartRef.current = false;
      skipEndRef.current = true;
      try {
        recognitionRef.current?.abort();
      } catch {
        // 忽略
      }
      recognitionRef.current = null;
    };
  }, []);

  return {
    isSupported:
      typeof window !== 'undefined' &&
      (!!window.SpeechRecognition || !!window.webkitSpeechRecognition),
  };
};
