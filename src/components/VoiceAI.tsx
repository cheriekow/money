import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AIParsedResult } from '../types';

interface VoiceAIProps {
  isLoggedIn: boolean;
  isProMember: boolean;
  onVoiceTriggerAuth: () => void;
  onVoiceTriggerPricing: () => void;
  onAIParsingComplete: (result: AIParsedResult) => void;
  triggerFeedback: (text: string, type?: 'success' | 'info') => void;
  currency: string;
  renderMicButton: (
    onClick: () => void,
    isRecording: boolean,
    isProcessing: boolean
  ) => React.ReactNode;
}

// Helper: Convert Blob to base64 string (without data url prefix)
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
  });
};

export const VoiceAI: React.FC<VoiceAIProps> = ({
  isLoggedIn,
  isProMember,
  onVoiceTriggerAuth,
  onVoiceTriggerPricing,
  onAIParsingComplete,
  triggerFeedback,
  currency,
  renderMicButton,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleMicClick = async () => {
    // 1. Auth check
    if (!isLoggedIn) {
      triggerFeedback('请先登录以使用 AI 语音记账功能！', 'info');
      onVoiceTriggerAuth();
      return;
    }

    // 2. Paywall check
    if (!isProMember) {
      triggerFeedback('AI 智能语音记账功能仅限 Pro 会员专享！', 'info');
      onVoiceTriggerPricing();
      return;
    }

    // 3. Toggle recording
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : '' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 15) {
            // Auto stop at 15s to keep it friendly
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      triggerFeedback('麦克风已开启，请开始说话...', 'success');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      triggerFeedback('无法启动麦克风，请检查浏览器录音权限！', 'info');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    let success = false;

    try {
      const userString = localStorage.getItem('user');
      const userObj = userString ? JSON.parse(userString) : null;
      const token = userObj?.token || 'mock-jwt-token-pro-456';

      const formData = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('audio', audioBlob, `recording.${ext}`);

      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-pro-status': isProMember ? 'true' : 'false',
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `API error (${response.status})`);
      }

      const resData = await response.json();
      if (resData.success) {
        onAIParsingComplete({
          mode: 'ai',
          sourceLabel: 'AI 解析',
          rawText: resData.transcript || '',
          items: resData.items || [],
          detected_total: resData.detected_total || null,
          calculated_total: resData.calculated_total || 0,
          total_matches: resData.total_matches !== undefined ? resData.total_matches : true,
          warnings: []
        });
        triggerFeedback('语音识别成功！', 'success');
        success = true;
      } else {
        throw new Error(resData.error || '后端未返回可用的识别结果');
      }
    } catch (err: any) {
      console.error('Gemini Voice AI failed:', err);
      // Fallback to SpeechRecognition
      triggerFeedback(`音频异常 (${err.message})，回退至本地识别...`, 'info');
      await fallbackToSpeechRecognition();
      success = true; // Assuming fallback handles its own errors or UI state
    }

    if (!success) {
      setIsProcessing(false);
    }
  };

  const fallbackToSpeechRecognition = (): Promise<void> => {
    return new Promise((resolve) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        triggerFeedback('您的浏览器不支持语音识别回退功能，请手动记账。', 'info');
        setIsProcessing(false);
        resolve();
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        triggerFeedback('回退模式：请再次说出记账内容...', 'info');
      };

      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        try {
          const userString = localStorage.getItem('user');
          const userObj = userString ? JSON.parse(userString) : null;
          const token = userObj?.token || 'mock-jwt-token-pro-456';

          const response = await fetch('/api/voice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-user-pro-status': isProMember ? 'true' : 'false',
            },
            body: JSON.stringify({ text }),
          });

          if (!response.ok) throw new Error('API error');
          const resData = await response.json();
          if (resData.success) {
            onAIParsingComplete({
              mode: 'ai',
              sourceLabel: 'AI 解析 (回退)',
              rawText: resData.transcript || text,
              items: resData.items || [],
              detected_total: resData.detected_total || null,
              calculated_total: resData.calculated_total || 0,
              total_matches: resData.total_matches !== undefined ? resData.total_matches : true,
              warnings: []
            });
            triggerFeedback('语音回退解析成功！', 'success');
          } else {
            throw new Error('解析失败');
          }
        } catch (e) {
          triggerFeedback('回退解析也失败了，请手动记账喵~', 'info');
        } finally {
          setIsProcessing(false);
          resolve();
        }
      };

      recognition.onerror = () => {
        triggerFeedback('回退识别错误，请手动记账喵~', 'info');
        setIsProcessing(false);
        resolve();
      };

      recognition.onend = () => {
        // Fallback ends
      };

      recognition.start();
    });
  };

  return (
    <>
      {/* 1. Render the actual mic button (passed to and placed inside App.tsx footer dock) */}
      {renderMicButton(handleMicClick, isRecording, isProcessing)}

      {/* 2. Floating dynamic HUD overlays (sliding up right above bottom navigation capsule) */}
      <AnimatePresence>
        {(isRecording || isProcessing) && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[320px] sm:max-w-[360px] z-55 pointer-events-auto flex flex-col gap-2.5 font-sans" id="voice-hud-container">
            
            {/* Recording Feedback Panel */}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                className="bg-neutral-900/95 border border-white/10 backdrop-blur-md px-4 py-3.5 rounded-[28px] shadow-2xl flex items-center justify-between gap-3 text-white"
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-black text-white">咕噜正在听你说话...</p>
                    <p className="text-[9px] text-neutral-400 font-medium">请说如：“买牛奶花了35元”</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black font-mono px-2.5 py-1 bg-white/10 rounded-full">
                    {recordingSeconds}s / 15s
                  </span>
                </div>
              </motion.div>
            )}

            {/* AI Speech Parsing loader */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                className="bg-neutral-900/95 border border-white/10 backdrop-blur-md px-4 py-3.5 rounded-[28px] shadow-2xl flex items-center gap-3 text-white"
              >
                <Icons.Loader2 size={16} className="animate-spin text-amber-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-black text-white">正在整理记账信息...</p>
                  <p className="text-[9px] text-neutral-400 font-medium">正在过滤杂音，匹配消费要素和预算</p>
                </div>
              </motion.div>
            )}
            
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
