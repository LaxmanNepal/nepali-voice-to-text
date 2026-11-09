import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AudioLines, Mic, Square, Copy, Download, Settings2, History, Languages,
  Play, Pause, Volume2, Trash2, Check, X, RotateCcw, FileAudio,
  Sparkles, CircleStop, Headphones, ChevronDown, AlertCircle
} from 'lucide-react';
import './styles.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [language, setLanguage] = useState('ne-NP');
  const [format, setFormat] = useState('raw');
  const [listening, setListening] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nv-history') || '[]'); } catch { return []; }
  });
  const [audioState, setAudioState] = useState('idle');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioName, setAudioName] = useState('');
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [voiceList, setVoiceList] = useState([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [voiceRate, setVoiceRate] = useState(1);
  const [voicePitch, setVoicePitch] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [toast, setToast] = useState('');
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const pausedRef = useRef(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const supported = !!SpeechRecognition;

  useEffect(() => { localStorage.setItem('nv-history', JSON.stringify(history)); }, [history]);
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
  }, []);
  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      setVoiceList(voices);
      if (!voiceURI && voices.length) {
        const preferred = voices.find(v => /ne[-_]np/i.test(v.lang)) || voices.find(v => /en[-_]us/i.test(v.lang)) || voices[0];
        setVoiceURI(preferred?.voiceURI || '');
      }
    };
    load();
    window.speechSynthesis?.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', load);
  }, [voiceURI]);
  useEffect(() => {
    if (audioState === 'recording') timerRef.current = setInterval(() => setAudioSeconds(s => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [audioState]);
  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch {}
    try { mediaRef.current?.stream?.getTracks().forEach(t => t.stop()); } catch {}
    window.speechSynthesis?.cancel();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const notify = message => { setToast(message); window.setTimeout(() => setToast(''), 2400); };
  const fmt = n => `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;

  function cleanText(value) {
    return value.replace(/(?:^|[\\s,])(?:अँहँ|अँ|मतलब)(?=[\\s,।!?]|$)[,\\s]*/g, ' ')
      .replace(/\\s+([,।!?])/g, '$1').replace(/([,।!?])\\s*([,।!?])+/g, '$1')
      .replace(/[ \\t]{2,}/g, ' ').trim();
  }
  const editorValue = format === 'clean' ? cleanText(text) : text;
  const wordCount = editorValue.trim() ? editorValue.trim().split(/\\s+/).length : 0;

  function startSpeech() {
    if (!supported) { setError('यो ब्राउजरले Speech Recognition समर्थन गर्दैन। Android Chrome प्रयोग गर्नुहोस्।'); return; }
    setError('');
    try { recognitionRef.current?.stop(); } catch {}
    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.lang = language === 'auto' ? '' : language;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onresult = event => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
        else interimChunk += result[0].transcript;
      }
      if (finalChunk) setText(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalChunk);
      setInterim(interimChunk);
    };
    rec.onerror = event => {
      const messages = {
        'not-allowed': 'माइक्रोफोन अनुमति दिनुहोस्। Browser settings मा Microphone Allow गर्नुहोस्।',
        'service-not-allowed': 'Speech service उपलब्ध छैन। इन्टरनेट र Browser permission जाँच्नुहोस्।',
        'no-speech': 'आवाज सुनिएन। फेरि बोल्नुहोस्।',
        'network': 'Speech recognition का लागि नेटवर्क समस्या भयो।',
        'audio-capture': 'माइक्रोफोन भेटिएन।'
      };
      setError(messages[event.error] || `Speech recognition समस्या: ${event.error}`);
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        shouldListenRef.current = false;
        setListening(false);
      }
    };
    rec.onend = () => {
      if (shouldListenRef.current && !pausedRef.current) {
        try { rec.start(); } catch { shouldListenRef.current = false; setListening(false); }
      } else if (pausedRef.current) {
        setListening(true);
        setSpeechPaused(true);
      } else {
        setListening(false);
        setSpeechPaused(false);
      }
    };
    shouldListenRef.current = true;
    pausedRef.current = false;
    setListening(true);
    setSpeechPaused(false);
    setInterim('');
    try { rec.start(); } catch { shouldListenRef.current = false; setListening(false); setError('माइक सुरु हुन सकेन। फेरि प्रयास गर्नुहोस्।'); }
  }
  function stopSpeech() {
    shouldListenRef.current = false;
    pausedRef.current = false;
    setListening(false);
    setSpeechPaused(false);
    setInterim('');
    try { recognitionRef.current?.stop(); } catch {}
  }
  function toggleSpeech() { listening ? stopSpeech() : startSpeech(); }
  function pauseSpeech() {
    pausedRef.current = true;
    shouldListenRef.current = false;
    setSpeechPaused(true);
    try { recognitionRef.current?.stop(); } catch {}
  }
  function resumeSpeech() {
    if (!supported) return;
    pausedRef.current = false;
    shouldListenRef.current = true;
    setSpeechPaused(false);
    try { recognitionRef.current?.start(); } catch { startSpeech(); }
  }

  async function startAudio() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => window.MediaRecorder?.isTypeSupported?.(t));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioName(`voice-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`);
        setAudioState('saved');
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start(500);
      setAudioSeconds(0);
      setAudioState('recording');
      setError('');
    } catch (e) {
      setError(e?.name === 'NotAllowedError' ? 'अडियो रेकर्डिङका लागि Microphone अनुमति दिनुहोस्।' : 'अडियो रेकर्डिङ सुरु हुन सकेन।');
    }
  }
  function stopAudio() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
  }
  function pauseAudio() {
    if (mediaRef.current?.state === 'recording') { mediaRef.current.pause(); setAudioState('paused'); }
    else if (mediaRef.current?.state === 'paused') { mediaRef.current.resume(); setAudioState('recording'); }
  }
  function playVoice() {
    if (!editorValue.trim() || !window.speechSynthesis) { setError('यो डिभाइसमा Text-to-Speech उपलब्ध छैन।'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(editorValue);
    utterance.rate = Number(voiceRate);
    utterance.pitch = Number(voicePitch);
    const selected = voiceList.find(v => v.voiceURI === voiceURI);
    if (selected) { utterance.voice = selected; utterance.lang = selected.lang; }
    else utterance.lang = language;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }
  function stopVoice() { window.speechSynthesis?.cancel(); setSpeaking(false); }
  async function copyText() {
    try { await navigator.clipboard.writeText(editorValue); notify('टेक्स्ट Copy भयो'); }
    catch { setError('Copy गर्न सकिएन। Text छानेर Copy गर्नुहोस्।'); }
  }
  function downloadText() {
    const blob = new Blob([editorValue], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nepali-voice-text.txt'; a.click(); URL.revokeObjectURL(url);
  }
  function saveHistory() {
    if (!editorValue.trim()) return;
    setHistory(items => [{ id: Date.now(), text: editorValue, created: new Date().toLocaleString() }, ...items].slice(0, 50));
    notify('History मा सुरक्षित भयो');
  }
  function reset() { stopSpeech(); setText(''); setInterim(''); setError(''); }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><AudioLines size={21}/></span><span>Nepali <b>Voice</b><small>VOICE WORKSPACE</small></span></a>
      <nav className="top-actions">
        <button className="nav-btn" onClick={() => setHistoryOpen(true)}><History size={17}/> <span>History</span></button>
        <button className="nav-btn settings-nav" onClick={() => setSettingsOpen(true)}><Settings2 size={17}/> <span>Settings</span></button>
      </nav>
    </header>

    <main className="workspace">
      <div className="workspace-heading"><div><div className="eyebrow"><Sparkles size={14}/> NEPALI-FIRST · FREE WORKSPACE</div><h1>आफ्नो कुरा <span>लेख्नुहोस्।</span></h1><p>बोल्नुहोस्, लाइभ टेक्स्ट हेर्नुहोस्, सम्पादन गर्नुहोस् र आवाजमा सुन्नुहोस्।</p></div><div className={listening ? 'live-status on' : 'live-status'}><i/>{listening ? (speechPaused ? 'PAUSED' : 'LIVE') : 'READY'}</div></div>

      <section className="editor-card">
        <div className="editor-toolbar"><div className="editor-label"><span className="editor-icon"><Languages size={17}/></span><div><b>तपाईंको लेख्ने ठाउँ</b><small>{language === 'ne-NP' ? 'नेपाली प्राथमिकता' : language === 'auto' ? 'Browser auto mode' : 'English Speech'} · {wordCount} शब्द</small></div></div><div className="format-switch"><button className={format === 'raw' ? 'chosen' : ''} onClick={() => setFormat('raw')}>Raw</button><button className={format === 'clean' ? 'chosen' : ''} onClick={() => setFormat('clean')}>Clean</button></div></div>
        <div className="editor-wrap"><textarea className="main-editor" value={editorValue + (interim ? (editorValue && !editorValue.endsWith(' ') ? ' ' : '') + interim : '')} onChange={e => { setText(e.target.value); setFormat('raw'); }} placeholder="यहाँ टाइप गर्नुहोस् वा माइक थिचेर बोल्न सुरु गर्नुहोस्…"/><div className="editor-foot"><span>{interim ? <><i className="pulse-dot"/> {interim}</> : 'तपाईंको टेक्स्ट यहीँ स्वतः देखिनेछ'}</span><span>{editorValue.length} characters</span></div><button className={`floating-mic ${listening && !speechPaused ? 'is-listening' : ''}`} onClick={toggleSpeech} aria-label={listening ? 'Stop dictation' : 'Start dictation'} title={listening ? 'Stop dictation' : 'Start dictation'}>{listening ? <Square size={21} fill="currentColor"/> : <Mic size={23}/>}</button></div>
        {listening && <div className="dictation-tools"><button onClick={speechPaused ? resumeSpeech : pauseSpeech}>{speechPaused ? <Play size={15}/> : <Pause size={15}/>} {speechPaused ? 'Resume' : 'Pause'}</button><button onClick={stopSpeech}><CircleStop size={15}/> Finish</button></div>}
        <div className="editor-actions"><button className="action-primary" onClick={copyText} disabled={!editorValue}><Copy size={16}/> Copy</button><button onClick={downloadText} disabled={!editorValue}><Download size={16}/> Download .TXT</button><button onClick={saveHistory} disabled={!editorValue}><History size={16}/> Save</button><button onClick={reset}><RotateCcw size={16}/> Clear</button><span className="action-spacer"/><button className="listen-text" onClick={speaking ? stopVoice : playVoice} disabled={!editorValue}>{speaking ? <Square size={15}/> : <Play size={15}/>} {speaking ? 'Stop voice' : 'Play voice'}</button></div>
      </section>

      <section className="audio-card">
        <div className="audio-heading"><div className="audio-symbol"><FileAudio size={19}/></div><div><h2>Voice Recording</h2><p>टेक्स्ट डिक्टेसनभन्दा अलग आफ्नो वास्तविक आवाज रेकर्ड गर्नुहोस्।</p></div><span className={audioState === 'recording' ? 'rec-badge active' : 'rec-badge'}>{audioState === 'recording' ? 'RECORDING' : audioState === 'paused' ? 'PAUSED' : audioState === 'saved' ? 'SAVED' : 'AUDIO'}</span></div>
        <div className="audio-controls"><div className="audio-timer">{fmt(audioSeconds)}</div><div className="audio-buttons">{audioState === 'idle' || audioState === 'saved' ? <button className="record-btn" onClick={startAudio}><Mic size={17}/> Record audio</button> : <><button className="record-btn stop-btn" onClick={stopAudio}><Square size={15} fill="currentColor"/> Stop</button><button className="audio-secondary" onClick={pauseAudio}>{audioState === 'paused' ? <Play size={15}/> : <Pause size={15}/>} {audioState === 'paused' ? 'Resume' : 'Pause'}</button></>}</div></div>
        {audioUrl && <div className="audio-playback"><audio ref={audioRef} src={audioUrl} controls/><a href={audioUrl} download={audioName}><Download size={15}/> Download recording</a></div>}
      </section>

      <section className="tts-card"><div className="tts-copy"><div className="tts-icon"><Volume2 size={19}/></div><div><b>Text to Voice</b><p>तपाईंले लेखेको टेक्स्ट डिभाइसमा उपलब्ध आवाजबाट सुन्नुहोस्।</p></div></div><div className="tts-action"><select value={voiceURI} onChange={e => setVoiceURI(e.target.value)} aria-label="Choose voice"><option value="">Automatic voice</option>{voiceList.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>)}</select><button onClick={speaking ? stopVoice : playVoice} disabled={!editorValue}>{speaking ? <Square size={15}/> : <Play size={15}/>} {speaking ? 'Stop' : 'Play text'}</button></div><small className="tts-note">आवाजको उपलब्धता तपाईंको फोन/ब्राउजरमा निर्भर हुन्छ। यो ब्राउजर TTS हो, डाउनलोड गर्न मिल्ने AI audio generation होइन।</small></section>

      {error && <div className="error-banner"><AlertCircle size={17}/><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
      <div className="privacy-note"><AlertCircle size={15}/><span>Speech recognition ब्राउजरको अनलाइन सेवामा निर्भर हुन सक्छ। वास्तविक अडियो रेकर्डिङ तपाईंको डिभाइसमा तयार हुन्छ। संवेदनशील सामग्री रेकर्ड नगर्नुहोस्।</span></div>
      <footer>NEPALI VOICE <span>·</span> FREE & OPEN SOURCE WORKSPACE</footer>
    </main>

    {settingsOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}><section className="settings-modal"><div className="modal-head"><div><h2><Settings2 size={19}/> Advanced Settings</h2><p>भाषा र आवाजको प्राथमिकता छान्नुहोस्।</p></div><button onClick={() => setSettingsOpen(false)}><X size={19}/></button></div><label className="setting-field"><span>Speech recognition language</span><select value={language} onChange={e => { setLanguage(e.target.value); if (listening) stopSpeech(); }}><option value="ne-NP">नेपाली — प्राथमिक</option><option value="en-US">English — US</option><option value="auto">Browser auto detect (सीमित)</option><option value="en-GB">English — UK</option></select><small>नेपाली प्राथमिक भाषा हो। Auto mode ले ब्राउजरको default भाषा प्रयोग गर्छ; यो वास्तविक बहुभाषिक AI detection होइन। भाषा परिवर्तन गर्दा चलिरहेको dictation रोकिन्छ।</small></label><label className="setting-field"><span>Text-to-speech voice</span><select value={voiceURI} onChange={e => setVoiceURI(e.target.value)}><option value="">Automatic / Device default</option>{voiceList.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}</select><small>नेपाली आवाज सूचीमा नभए फोनको TTS engine ले English वा default आवाज प्रयोग गर्न सक्छ।</small></label><label className="setting-field"><span>Voice speed · {Number(voiceRate).toFixed(1)}x</span><input type="range" min="0.6" max="1.4" step="0.1" value={voiceRate} onChange={e => setVoiceRate(e.target.value)}/></label><label className="setting-field"><span>Voice pitch · {Number(voicePitch).toFixed(1)}</span><input type="range" min="0.7" max="1.3" step="0.1" value={voicePitch} onChange={e => setVoicePitch(e.target.value)}/></label><div className="setting-info"><b>भाषा स्वतः पहिचान</b><p>हालको Browser Speech API मा भरपर्दो Nepali-English automatic language detection छैन। त्यसैले गलत भाषा अनुमान नगर्न नेपाली र English छुट्टै चयन गर्न मिल्ने बनाइएको छ।</p></div><div className="setting-info"><b>AI आवाज र डाउनलोड</b><p>हाल Play सुविधा डिभाइसको built-in TTS हो। Browser API ले बनेको TTS अडियो फाइल export गर्दैन। डाउनलोड हुने फाइल Voice Recording section मा रेकर्ड गरिएको वास्तविक आवाज हो।</p></div><button className="modal-done" onClick={() => setSettingsOpen(false)}><Check size={16}/> Done</button></section></div>}

    {historyOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setHistoryOpen(false); }}><section className="settings-modal history-modal"><div className="modal-head"><div><h2><History size={19}/> Transcript History</h2><p>यो डिभाइसको ब्राउजरमा मात्र सुरक्षित हुन्छ।</p></div><button onClick={() => setHistoryOpen(false)}><X size={19}/></button></div>{history.length ? <div className="history-list">{history.map(item => <button key={item.id} onClick={() => { setText(item.text); setFormat('raw'); setHistoryOpen(false); }}><span>{item.text.slice(0, 180)}</span><small>{item.created}</small></button>)}</div> : <div className="history-empty">अहिलेसम्म कुनै टेक्स्ट सुरक्षित छैन।</div>}<button className="modal-done" onClick={() => { setHistory([]); localStorage.removeItem('nv-history'); }}> <Trash2 size={15}/> Clear history</button></section></div>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
