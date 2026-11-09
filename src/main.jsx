import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Mic, Square, Copy, Download, Trash2, Languages, History, AudioLines, AlertCircle, Check, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import './styles.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function cleanNepali(value) {
  return value
    .replace(/(?:^|[\s,])(?:अँहँ|अँ|मतलब|भनेको)(?=[\s,।!?]|$)[,\s]*/g, ' ')
    .replace(/चाहिँ\s+चाहिँ/g, 'चाहिँ')
    .replace(/त्यो चाहिँ\s*/g, 'त्यो ')
    .replace(/\s+([,।!?])/g, '$1')
    .replace(/([,।!?])\s*([,।!?])+/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Convenience transliteration only; this is not a standards-compliant Nepali romanizer.
function toRoman(input) {
  const map = {
    'अ':'a','आ':'aa','इ':'i','ई':'ii','उ':'u','ऊ':'uu','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
    'क':'ka','ख':'kha','ग':'ga','घ':'gha','ङ':'nga','च':'cha','छ':'chha','ज':'ja','झ':'jha','ञ':'nya',
    'ट':'Ta','ठ':'Tha','ड':'Da','ढ':'Dha','ण':'Na','त':'ta','थ':'tha','द':'da','ध':'dha','न':'na',
    'प':'pa','फ':'pha','ब':'ba','भ':'bha','म':'ma','य':'ya','र':'ra','ल':'la','व':'wa','श':'sha','ष':'Sha','स':'sa','ह':'ha',
    'ा':'a','ि':'i','ी':'ii','ु':'u','ू':'uu','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au','ं':'n','ँ':'n','ः':'h','्':'',
    '।':'.','ऽ':''
  };
  return [...input].map(ch => map[ch] ?? ch).join('').replace(/([kgcjTDtdnpbmyrlvsh])a(?=[ािीुूृेैोौंँः्])/g, '$1').replace(/\s+/g, ' ').trim();
}

function App() {
  const [mode, setMode] = useState('clean');
  const [output, setOutput] = useState('devanagari');
  const [language, setLanguage] = useState('ne-NP');
  const [raw, setRaw] = useState('');
  const [manual, setManual] = useState(null);
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nv-history') || '[]'); } catch { return []; }
  });
  const [tab, setTab] = useState('write');
  const recRef = useRef(null);
  const restartRef = useRef(false);
  const pausedRef = useRef(false);
  const timerRef = useRef(null);
  const supported = !!SpeechRecognition;

  useEffect(() => { localStorage.setItem('nv-history', JSON.stringify(history)); }, [history]);
  useEffect(() => {
    if (listening && !paused) timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [listening, paused]);

  const transcript = mode === 'raw' ? raw : cleanNepali(raw);
  const finalText = output === 'roman' ? toRoman(transcript) : transcript;
  const displayText = manual === null ? finalText : manual;

  function start() {
    if (!supported) {
      setError('यो Browser मा Speech Recognition उपलब्ध छैन। Android मा Chrome प्रयोग गरेर प्रयास गर्नुहोस्।');
      return;
    }
    setError('');
    setManual(null);
    const rec = new SpeechRecognition();
    recRef.current = rec;
    rec.lang = language;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = event => {
      let finals = '';
      let currentInterim = '';
      // Only consume results added/updated by this event; earlier finals are not appended again.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finals += result[0].transcript.trim() + ' ';
        else currentInterim += result[0].transcript;
      }
      if (finals.trim()) setRaw(previous => (previous + ' ' + finals).trim());
      setInterim(currentInterim);
    };
    rec.onerror = event => {
      setError(event.error === 'not-allowed' ? 'Microphone अनुमति दिनुहोस्।' : `Speech recognition error: ${event.error}`);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        restartRef.current = false;
        setListening(false);
      }
    };
    rec.onend = () => {
      if (restartRef.current && !pausedRef.current) {
        try { rec.start(); } catch { setListening(false); }
      } else {
        setListening(false);
      }
    };
    restartRef.current = true;
    pausedRef.current = false;
    setListening(true);
    setPaused(false);
    setSeconds(0);
    setRaw('');
    setInterim('');
    try { rec.start(); }
    catch { restartRef.current = false; setListening(false); setError('Recording सुरु हुन सकेन। पुनः प्रयास गर्नुहोस्।'); }
  }

  function pause() {
    pausedRef.current = true;
    restartRef.current = false;
    setPaused(true);
    try { recRef.current?.stop(); } catch {}
  }

  function resume() {
    if (!supported || !recRef.current) { start(); return; }
    pausedRef.current = false;
    restartRef.current = true;
    try { recRef.current.start(); setPaused(false); setListening(true); }
    catch { setError('Resume गर्न सकिएन। Stop गरेर फेरि सुरु गर्नुहोस्।'); }
  }

  function stop(save = true) {
    restartRef.current = false;
    pausedRef.current = false;
    setListening(false);
    setPaused(false);
    setInterim('');
    try { recRef.current?.stop(); } catch {}
    if (save && raw.trim()) {
      setHistory(items => [{ id: Date.now(), text: raw, created: new Date().toLocaleString(), seconds }, ...items].slice(0, 50));
    }
  }

  function clear() {
    stop(false);
    setRaw('');
    setManual(null);
    setSeconds(0);
    setError('');
  }

  async function copy() {
    try { await navigator.clipboard.writeText(displayText); setError('Copied to clipboard.'); }
    catch { setError('Copy गर्न सकिएन। टेक्स्ट छानेर Copy गर्नुहोस्।'); }
  }

  function download() {
    const blob = new Blob([displayText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nepali-voice-transcript.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function loadItem(item) {
    stop(false);
    setRaw(item.text);
    setManual(null);
    setTab('write');
  }

  const fmt = value => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><AudioLines size={21}/></span><span>Nepali <b>Voice</b><small>VOICE TO TEXT STUDIO</small></span></a>
      <div className="top-actions"><span className="free-pill">● FREE MODE</span><button className="icon-btn" title="History" onClick={() => setTab(tab === 'history' ? 'write' : 'history')}><History size={19}/></button></div>
    </header>
    <main className="main">
      <section className="intro"><div className="eyebrow"><Sparkles size={14}/> NEPALI-FIRST SPEECH WORKSPACE</div><h1>बोल्नुहोस्।<br/><span>सफा टेक्स्ट पाउनुहोस्।</span></h1><p>आफ्नो प्राकृतिक शैलीमा बोल्नुहोस्। नेपाली वा Roman Nepali मा रूपान्तरण गर्नुहोस्।</p></section>
      {tab === 'history' ? <section className="panel history-panel">
        <div className="section-head"><div><h2>Recording History</h2><p>यो इतिहास यही Browser मा सुरक्षित हुन्छ।</p></div><button className="text-btn danger" onClick={() => { setHistory([]); localStorage.removeItem('nv-history'); }}><Trash2 size={15}/> Clear all</button></div>
        {history.length === 0 ? <div className="empty"><History size={30}/><b>अहिलेसम्म History छैन</b><span>तपाईंले रेकर्डिङ रोक्दा यहाँ देखिनेछ।</span></div> : history.map(item => <button className="history-item" key={item.id} onClick={() => loadItem(item)}><span>{item.text.slice(0, 130)}{item.text.length > 130 ? '…' : ''}</span><small>{item.created} · {fmt(item.seconds || 0)}</small></button>)}
      </section> : <>
        <section className="panel recorder">
          <div className="section-head"><div><h2>Voice Recorder</h2><p>रेकर्ड गर्न थिच्नुहोस् र स्वाभाविक रूपमा बोल्नुहोस्।</p></div><span className={`status ${listening ? 'live' : ''}`}><i/>{listening ? (paused ? 'PAUSED' : 'LISTENING') : 'READY'}</span></div>
          <div className={`mic-stage ${listening && !paused ? 'active' : ''}`}><div className="sound-wave">{Array.from({ length: 31 }, (_, i) => <i key={i} style={{ '--h': `${12 + (i * 19 % 33)}px` }}/>)}</div><button className={`mic-button ${listening ? 'recording' : ''}`} onClick={() => listening ? stop() : start()} aria-label={listening ? 'Stop recording' : 'Start recording'}>{listening ? <Square size={27} fill="currentColor"/> : <Mic size={30}/>}</button><div className="record-time">{fmt(seconds)}</div><div className="mic-hint">{listening ? (paused ? 'रेकर्डिङ रोकिएको छ' : 'तपाईंको आवाज सुन्दैछ…') : 'रेकर्डिङ सुरु गर्न माइक्रोफोन थिच्नुहोस्'}</div></div>
          <div className="rec-controls">{listening && <button className="secondary-btn" onClick={paused ? resume : pause}>{paused ? <Play size={16}/> : <Pause size={16}/>} {paused ? 'Resume' : 'Pause'}</button>}<button className="secondary-btn" onClick={clear}><RotateCcw size={16}/> Reset</button><span className="rec-note">{supported ? 'Browser speech recognition' : 'Speech recognition unsupported'}</span></div>
          {!supported && <div className="warning"><AlertCircle size={17}/> यो Browser मा Speech Recognition उपलब्ध छैन। Chrome वा समर्थित Browser प्रयोग गर्नुहोस्।</div>}
          {error && <div className="notice" onClick={() => setError('')}>{error} <span>×</span></div>}
        </section>
        <section className="panel settings">
          <div className="section-head"><div><h2>Output Settings</h2><p>तपाईंलाई चाहिएको लेखन शैली छान्नुहोस्।</p></div><Languages size={20} className="muted"/></div>
          <div className="setting-grid"><label><span>Speech language</span><select value={language} onChange={event => setLanguage(event.target.value)}><option value="ne-NP">नेपाली (Nepal)</option><option value="en-US">English (US)</option><option value="hi-IN">Hindi</option></select></label><label><span>Writing format</span><select value={output} onChange={event => setOutput(event.target.value)}><option value="devanagari">नेपाली Unicode</option><option value="roman">Roman Nepali</option></select></label></div>
          <div className="mode-label">TRANSCRIPTION STYLE</div><div className="mode-options">{[['raw', 'Raw', 'जस्ताको तस्तै'], ['clean', 'Clean', 'फिलर शब्द हटाउने'], ['formal', 'Pure Nepali', 'शुद्ध भाषा']].map(([value, title, desc]) => <button key={value} className={`mode-card ${mode === value ? 'selected' : ''}`} onClick={() => setMode(value)}><b>{title}</b><small>{desc}</small>{mode === value && <Check size={15}/>}</button>)}</div>
          <p className="mode-disclaimer">Clean र Pure Nepali हाल नियम-आधारित सफाइ हुन्, Generative AI Rewrite होइनन्।</p>
        </section>
        <section className="panel output-panel">
          <div className="section-head"><div><h2>Your Transcript</h2><p>{raw.trim() ? `${raw.trim().split(/\s+/).length} शब्द · ${raw.length} अक्षर` : 'तपाईंको ट्रान्सक्रिप्सन यहाँ देखिनेछ।'}</p></div><span className="output-tag">{output === 'roman' ? 'ROMAN' : 'UNICODE'}</span></div>
          <textarea value={displayText} onChange={event => setManual(event.target.value)} placeholder="तपाईंले बोलेको टेक्स्ट यहाँ देखिनेछ…"/>
          <div className="interim">{interim && <><span className="live-dot"/> {interim}</>}</div>
          <div className="output-actions"><button className="primary-btn" onClick={copy} disabled={!displayText}><Copy size={16}/> Copy text</button><button className="secondary-btn" onClick={download} disabled={!displayText}><Download size={16}/> .TXT</button><button className="secondary-btn" onClick={() => { if (raw.trim()) setHistory(items => [{ id: Date.now(), text: raw, created: new Date().toLocaleString(), seconds }, ...items].slice(0, 50)); }} disabled={!raw.trim()}><History size={16}/> Save</button></div>
        </section>
      </>}
      <section className="privacy"><AlertCircle size={16}/><div><b>Privacy & zero-cost note</b><p>यो MVP ले कुनै Paid API प्रयोग गर्दैन। तर Browser को Speech Recognition ले तपाईंको आवाज बाह्य recognition service मा पठाउन सक्छ। यो पूर्ण Offline वा end-to-end private प्रणाली होइन। संवेदनशील कुरा रेकर्ड नगर्नुहोस्।</p></div></section>
      <footer>NEPALI VOICE <span>·</span> MVP 0.1.0 <span>·</span> Built for Nepali speakers</footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
