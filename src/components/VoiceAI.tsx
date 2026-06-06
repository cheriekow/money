import React, { useState, useEffect, useRef } from 'react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize speech recognition if available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setIsRecording(false);
        await processText(text);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        handleManualInput();
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleManualInput = () => {
    triggerFeedback('语音识别暂时不稳定，请直接输入一句记账内容。', 'info');
    setTimeout(() => {
      const text = window.prompt('请输入记账内容 (如: 买了咖啡15块):');
      if (text && text.trim() !== '') {
        processText(text.trim());
      } else {
        setIsProcessing(false);
      }
    }, 100);
  };

  const processText = async (text: string) => {
    setIsProcessing(true);

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

      if (!response.ok) {
        throw new Error(`API error`);
      }

      const resData = await response.json();
      if (resData.success) {
        onAIParsingComplete({
          mode: 'ai',
          sourceLabel: 'AI 语音记账',
          rawText: resData.transcript || text,
          items: resData.items || [],
          detected_total: resData.detected_total || null,
          calculated_total: resData.calculated_total || 0,
          total_matches: resData.total_matches !== undefined ? resData.total_matches : true,
          warnings: []
        });
        triggerFeedback('语音解析成功！', 'success');
      } else {
        throw new Error('后端解析失败');
      }
    } catch (err: any) {
      console.error('Text parsing failed:', err);
      triggerFeedback('AI 解析暂时不可用，请稍后再试。', 'info');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = () => {
    if (!isLoggedIn) {
      triggerFeedback('请先登录以使用 AI 语音记账功能！', 'info');
      onVoiceTriggerAuth();
      return;
    }

    if (!isProMember) {
      triggerFeedback('AI 智能语音记账功能仅限 Pro 会员专享！', 'info');
      onVoiceTriggerPricing();
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          handleManualInput();
        }
      } else {
        handleManualInput();
      }
    }
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {(isRecording || isProcessing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={() => {
              if (isRecording && recognitionRef.current) {
                recognitionRef.current.stop();
                setIsRecording(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-50">
        <div className="flex justify-center mt-2.5 mb-1.5 relative">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[90vw] max-w-[320px] pointer-events-none">
            <AnimatePresence mode="wait">
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  className="bg-neutral-900/95 border border-white/10 backdrop-blur-md px-4 py-3.5 rounded-[28px] shadow-2xl flex items-center justify-between gap-3 text-white pointer-events-auto"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-white">正在倾听您的记账口令...</p>
                      <p className="text-[9px] text-neutral-400 font-medium">请说如：“买牛奶花了35元”</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  className="bg-neutral-900/95 border border-white/10 backdrop-blur-md px-4 py-3.5 rounded-[28px] shadow-2xl flex items-center gap-3 text-white pointer-events-auto"
                >
                  <Icons.Loader2 size={16} className="animate-spin text-amber-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-black text-white">正在整理记账信息...</p>
                    <p className="text-[9px] text-neutral-400 font-medium">智能分析中，请稍候</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            whileTap={{ scale: 0.9 }}
            animate={{ scale: isRecording ? 1.1 : 1 }}
          >
            {renderMicButton(handleMicClick, isRecording, isProcessing)}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
