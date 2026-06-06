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
  const [userManuallyStopped, setUserManuallyStopped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reachedTimeout, setReachedTimeout] = useState(false);

  const isRecordingRef = useRef(false);
  const userManuallyStoppedRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio specific refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Fallback
  const recognitionRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/mpeg',
      'audio/ogg;codecs=opus'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const handleManualInput = () => {
    triggerFeedback('录音暂时不可用，请直接输入一句记账内容。', 'info');
    setTimeout(() => {
      const text = window.prompt('请输入记账内容 (如: 买了咖啡15块):');
      if (text && text.trim() !== '') {
        setUserManuallyStopped(true);
        userManuallyStoppedRef.current = true;
        processText(text.trim());
      } else {
        setIsProcessing(false);
      }
    }, 100);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const sendToApi = async (payload: any) => {
    setIsProcessing(true);
    try {
      const userString = localStorage.getItem('user');
      const userObj = userString ? JSON.parse(userString) : null;
      const token = userObj?.token || 'mock-jwt-token-pro-456';

      const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
      const year = today.getUTCFullYear();
      const month = String(today.getUTCMonth() + 1).padStart(2, '0');
      const day = String(today.getUTCDate()).padStart(2, '0');
      payload.today = `${year}-${month}-${day}`;

      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-pro-status': isProMember ? 'true' : 'false',
        },
        body: JSON.stringify(payload),
      });

      console.log('[DEBUG Frontend] api_voice_status:', response.status);

      if (!response.ok) {
        console.log('[DEBUG Frontend] fallback_reason: API returned error status', response.status);
        throw new Error(`API error`);
      }

      const resData = await response.json();
      console.log('[DEBUG Frontend] api_voice_response:', resData);

      if (resData.success) {
        // Print debug logs in browser console
        console.log('--- AI Voice Accounting Extraction Debug ---');
        console.log('heard_text:', resData.heard_text || payload.text);
        if (resData.items && resData.items.length > 0) {
          resData.items.forEach((item: any, idx: number) => {
            console.log(`Item #${idx + 1}:`);
            console.log('  original Gemini note:', item.original_note || item.note);
            console.log('  final cleaned note:', item.note);
            console.log('  confidence:', item.confidence);
          });
        } else {
          console.log('No items extracted.');
        }
        console.log('warnings:', resData.warnings || []);
        console.log('---------------------------------------------');

        const finalData = {
          mode: 'ai' as const,
          sourceLabel: 'AI 语音记账',
          rawText: resData.transcript || payload.text || resData.heard_text || '录音已解析',
          items: resData.items || [],
          detected_total: resData.detected_total || null,
          calculated_total: resData.calculated_total || 0,
          total_matches: resData.total_matches !== undefined ? resData.total_matches : true,
          warnings: resData.warnings || []
        };
        console.log('[DEBUG Frontend] final_prefill_values (passing to App.tsx):', finalData);

        onAIParsingComplete(finalData);
        triggerFeedback('语音解析成功！', 'success');
      } else {
        throw new Error('后端解析失败');
      }
    } catch (err: any) {
      console.error('API request failed:', err);
      triggerFeedback('AI 解析暂时不可用，请稍后再试。', 'info');
    } finally {
      setIsProcessing(false);
    }
  };

  const processAudioBlob = async (blob: Blob, mimeType: string) => {
    if (!userManuallyStoppedRef.current) return;
    
    try {
      console.log('[DEBUG Frontend] audio_blob_size:', blob.size);
      console.log('[DEBUG Frontend] audio_mime_type:', mimeType);
      
      const base64 = await blobToBase64(blob);
      console.log('[DEBUG Frontend] base64_length:', base64.length);
      console.log('[DEBUG Frontend] sending_payload_mode: audio');

      await sendToApi({
        mode: 'audio',
        audioBase64: base64,
        mimeType: mimeType
      });
    } catch (err) {
      console.error('Failed to process audio blob:', err);
      triggerFeedback('音频处理失败，请稍后再试。', 'info');
      setIsProcessing(false);
    }
  };

  const processText = async (text: string) => {
    if (!userManuallyStoppedRef.current) return;
    
    console.log('[DEBUG Frontend] sending_payload_mode: text (fallback)');
    console.log('[DEBUG Frontend] audio_blob_size: 0 (fallback text used)');
    console.log('[DEBUG Frontend] audio_mime_type: null');
    console.log('[DEBUG Frontend] base64_length: 0');

    await sendToApi({ mode: 'text', text });
  };

  const startSpeechRecognitionFallback = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (!recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('[DEBUG Frontend] recording_start (Fallback SpeechRecognition)');
        };

        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              text += event.results[i][0].transcript;
            }
          }
          if (text) {
            accumulatedTranscriptRef.current += text;
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'no-speech' || event.error === 'aborted') return;
          console.log('[DEBUG Frontend] fallback_reason: Speech recognition fatal error ->', event.error);
          setIsRecording(false);
          isRecordingRef.current = false;
          handleManualInput();
        };

        recognition.onend = () => {
          if (isRecordingRef.current && !userManuallyStoppedRef.current) {
            try { recognition.start(); } catch(e){}
          } else if (userManuallyStoppedRef.current) {
            console.log('[DEBUG Frontend] recording_stop (Speech recognition ended)');
            const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
            console.log('[DEBUG Frontend] recording_duration:', duration, 'seconds');
            const text = accumulatedTranscriptRef.current.trim();
            if (text) {
              processText(text);
            } else {
              console.log('[DEBUG Frontend] fallback_reason: Transcript was empty when recording ended');
              handleManualInput();
            }
          }
        };

        recognitionRef.current = recognition;
      }
      try {
        recognitionRef.current.start();
      } catch (e) {
        handleManualInput();
      }
    } else {
      handleManualInput();
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    isRecordingRef.current = true;
    setUserManuallyStopped(false);
    userManuallyStoppedRef.current = false;
    setReachedTimeout(false);
    audioChunksRef.current = [];
    accumulatedTranscriptRef.current = '';
    recordingStartTimeRef.current = Date.now();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const mimeType = getSupportedMimeType();
        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          console.log('[DEBUG Frontend] recording_stop (MediaRecorder ended)');
          const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
          console.log('[DEBUG Frontend] recording_duration:', duration, 'seconds');
          
          if (userManuallyStoppedRef.current) {
            const finalMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
            if (audioBlob.size > 0) {
              processAudioBlob(audioBlob, finalMimeType);
            } else {
              console.log('[DEBUG Frontend] fallback_reason: audio blob size is 0');
              handleManualInput();
            }
          }
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        };

        mediaRecorder.start();
        console.log('[DEBUG Frontend] recording_start (MediaRecorder)');
      } else {
        console.log('[DEBUG Frontend] navigator.mediaDevices.getUserMedia not supported, falling back');
        startSpeechRecognitionFallback();
      }
    } catch (err) {
      console.warn('Error starting MediaRecorder, falling back:', err);
      startSpeechRecognitionFallback();
    }

    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    timeoutTimerRef.current = setTimeout(() => {
      setReachedTimeout(true);
      triggerFeedback('已达到最长录音时间，正在整理记账信息...', 'info');
      stopRecording();
    }, 30000);
  };

  const stopRecording = () => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    setUserManuallyStopped(true);
    userManuallyStoppedRef.current = true;
    setIsRecording(false);
    isRecordingRef.current = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else if (streamRef.current) {
      // In case mediaRecorder failed but stream was open
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      handleManualInput();
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
      stopRecording();
    } else {
      startRecording();
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
              if (isRecording) {
                stopRecording();
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
                      <p className="text-xs font-black text-white">正在聆听... 再按一次完成录音</p>
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
                    <p className="text-xs font-black text-white">
                      {reachedTimeout ? '已达到最长录音时间，正在整理记账信息...' : '正在分析录音中...'}
                    </p>
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
