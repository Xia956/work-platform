"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0?: { transcript?: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function recognitionErrorMessage(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "请允许麦克风权限后再试";
  }
  if (error === "no-speech") return "没有听清，再试一次吧";
  if (error === "audio-capture") return "没有找到可用的麦克风";
  return "语音输入暂时不可用，请稍后再试";
}

export function mergeVoiceTranscript(
  current: string,
  results: ArrayLike<SpeechRecognitionResultLike>,
  maxLength: number,
) {
  const transcript = Array.from(results, (result) => result[0]?.transcript ?? "").join("").trim();
  const separator = current && transcript && !/\s$/.test(current) ? "\n" : "";
  return `${current}${separator}${transcript}`.slice(0, maxLength);
}

export function VoiceInputControl({
  value,
  onChange,
  maxLength,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  disabled?: boolean;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("开始语音输入");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      }
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
    setMessage("语音已结束，可以继续输入");
  }

  function startListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      setMessage("当前浏览器暂不支持语音输入");
      return;
    }

    const recognition = new Recognition();
    const initialValue = value;
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    let failed = false;
    recognition.onresult = (event) => {
      onChange(mergeVoiceTranscript(initialValue, event.results, maxLength));
    };
    recognition.onerror = (event) => {
      failed = true;
      setMessage(recognitionErrorMessage(event.error));
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (!failed) setMessage("语音已结束，可以继续输入");
    };

    recognitionRef.current = recognition;
    setMessage("正在听，想到什么就直接说");
    setListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setMessage("语音输入暂时不可用，请稍后再试");
    }
  }

  const accessibleLabel = supported === false
    ? "当前浏览器暂不支持语音输入"
    : listening
      ? "结束语音输入"
      : "开始语音输入";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="ui-field-action"
      onClick={listening ? stopListening : startListening}
      disabled={disabled || supported !== true}
      aria-label={accessibleLabel}
      aria-pressed={listening}
      title={message}
    >
      {listening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
    </Button>
  );
}
