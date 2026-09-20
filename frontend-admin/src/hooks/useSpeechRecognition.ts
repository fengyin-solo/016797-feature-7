import { useEffect, useRef } from 'react';
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
  const chineseRegex = /[\u4e00-\u9fa5]/g;
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

export const useSpeechRecognition = () => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const resultReceivedRef = useRef(false);
  // 记录导致识别中断的错误，onend 时据此进入可恢复状态
  const fatalErrorRef = useRef<string | null>(null);
  // 最近一次已提交的最终结果，用于恢复后去重
  const lastFinalRef = useRef<{ text: string; time: number } | null>(null);

  const recognitionStatus = useAppStore(state => state.recognitionStatus);
  const sourceLang = useAppStore(state => state.sourceLang);
  const targetLang = useAppStore(state => state.targetLang);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      if (recognitionStatus === 'listening') {
        useAppStore.getState().addToast('error', '浏览器不支持语音识别');
        useAppStore.getState().stopRecognition();
      }
      return;
    }

    if (recognitionStatus === 'listening') {
      console.log('[语音识别] 🎯 初始化...');

      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      shouldRestartRef.current = true;
      speechDetectedRef.current = false;
      resultReceivedRef.current = false;
      fatalErrorRef.current = null;

      // 关键配置
      recognition.continuous = false;  // 改为 false，每次说完一句就停止
      recognition.interimResults = true;
      recognition.lang = sourceLang;
      recognition.maxAlternatives = 1;

      console.log('[语音识别] 配置:', { lang: sourceLang, continuous: false, interimResults: true });

      recognition.onstart = () => {
        console.log('[语音识别] ✅ 已启动');
        useAppStore.getState().addToast('success', '请说话...');
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

        if (interim) {
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

          // 恢复识别后浏览器可能重投暂停前的最终结果，同一条内容不重复记录
          const trimmedFinal = final.trim();
          const now = Date.now();
          if (
            lastFinalRef.current &&
            lastFinalRef.current.text === trimmedFinal &&
            now - lastFinalRef.current.time < 2000
          ) {
            console.log('[语音识别] ⚠️ 重复结果，已忽略:', trimmedFinal);
            store.setCurrentSubtitle('');
            return;
          }
          lastFinalRef.current = { text: trimmedFinal, time: now };

          console.log('[语音识别] ✅ 最终:', final);
          store.setCurrentSubtitle('');
          const translated = translateText(final, currentSourceLang, store.targetLang);
          store.addSubtitle(final, translated);

          // 立即播报翻译结果
          speakText(translated, store.targetLang);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[语音识别] ❌ 错误:', event.error);

        if (event.error === 'not-allowed') {
          // 权限被拒绝无法自动恢复，直接回到关闭状态
          useAppStore.getState().addToast('error', '请允许麦克风权限');
          shouldRestartRef.current = false;
          useAppStore.getState().stopRecognition();
        } else if (event.error === 'no-speech') {
          console.log('[语音识别] 未检测到语音');
        } else if (event.error === 'network') {
          // 网络异常：记录错误，onend 时进入可恢复的暂停状态
          console.log('[语音识别] ⚠️ 网络错误');
          fatalErrorRef.current = 'network';
        } else if (event.error === 'audio-capture' || event.error === 'service-not-allowed') {
          // 音频设备/识别服务异常：同样进入可恢复状态
          console.log('[语音识别] ⚠️ 识别服务异常:', event.error);
          fatalErrorRef.current = event.error;
        }
      };

      recognition.onend = () => {
        console.log('[语音识别] 🔚 结束');
        console.log('[语音识别] speechDetected:', speechDetectedRef.current);
        console.log('[语音识别] resultReceived:', resultReceivedRef.current);

        // 如果检测到语音但没有结果，说明可能是网络问题
        if (speechDetectedRef.current && !resultReceivedRef.current) {
          console.log('[语音识别] ⚠️ 检测到语音但无结果，可能是网络问题');
          useAppStore.getState().addToast('warning', '语音已检测但无法识别，请检查网络');
        }

        // 重置状态
        speechDetectedRef.current = false;
        resultReceivedRef.current = false;

        // 识别被浏览器中断或网络异常：回到可恢复的暂停状态，保留已识别内容
        const fatalError = fatalErrorRef.current;
        fatalErrorRef.current = null;
        if (fatalError) {
          shouldRestartRef.current = false;
          const store = useAppStore.getState();
          if (store.recognitionStatus === 'listening') {
            store.markInterrupted(
              fatalError === 'network'
                ? '网络异常，识别已暂停，点击继续可恢复'
                : '识别被中断，点击继续可恢复'
            );
          }
          return;
        }

        // 自动重启
        if (shouldRestartRef.current && useAppStore.getState().recognitionStatus === 'listening') {
          setTimeout(() => {
            if (shouldRestartRef.current && recognitionRef.current) {
              try {
                console.log('[语音识别] 🔄 重启...');
                recognitionRef.current.start();
              } catch (e) {
                console.error('[语音识别] 重启失败:', e);
              }
            }
          }, 500);
        }
      };

      try {
        recognition.start();
        console.log('[语音识别] 🚀 启动成功');
      } catch (e) {
        console.error('[语音识别] 启动失败:', e);
      }

    } else if (recognitionStatus === 'paused') {
      // 暂停：停止识别，但保留已识别内容与当前语言设置
      console.log('[语音识别] ⏸️ 暂停');
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    } else {
      console.log('[语音识别] 🛑 停止');
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      useAppStore.getState().setCurrentSubtitle('');
    }

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [recognitionStatus, sourceLang, targetLang]);

  return {
    isSupported: typeof window !== 'undefined' &&
      (!!window.SpeechRecognition || !!window.webkitSpeechRecognition),
  };
};
