import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './App.css';

// Theme context
const ThemeContext = createContext();

// Loading spinner component
const Spinner = () => (
  <div className="spinner"></div>
);

// Symptom tag component
const SymptomTag = ({ symptom, onRemove }) => (
  <div className="symptom-tag">
    <span className="symptom-text">{symptom}</span>
    <button className="remove-button" onClick={onRemove}>&times;</button>
  </div>
);

// Progress bar component
const ProgressBar = ({ value, max = 100 }) => (
  <div className="progress-bar">
    <div 
      className="progress-bar-fill" 
      style={{ width: `${(value/max) * 100}%` }}
    />
  </div>
);

// Collapsible section component
const CollapsibleSection = ({ title, children, isOpen, onToggle }) => (
  <div className="collapsible">
    <div className="collapsible-header" onClick={onToggle}>
      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
      <span style={{ color: 'var(--text-primary)' }}>{isOpen ? '▼' : '▶'}</span>
    </div>
    <div className={`collapsible-content ${isOpen ? 'open' : ''}`}>
      {children}
    </div>
  </div>
);

function App() {
  const { t, i18n } = useTranslation();
  const [symptoms, setSymptoms] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [needMoreInfo, setNeedMoreInfo] = useState(false);
  const [accumulatedSymptoms, setAccumulatedSymptoms] = useState([]);
  const [extra, setExtra] = useState("");
  const [listening, setListening] = useState(false);
  const [backendMessage, setBackendMessage] = useState(null);
  const [description, setDescription] = useState(null);
  const [medicines, setMedicines] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [multiPredictions, setMultiPredictions] = useState([]);
  const [lang, setLang] = useState(i18n.resolvedLanguage || i18n.language);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [theme, setTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    medicines: true,
    symptoms: true
  });
  const [extractedSymptoms, setExtractedSymptoms] = useState([]);
  const [extractedExtraSymptoms, setExtractedExtraSymptoms] = useState([]);
  const debounceTimeout = useRef(null);
  const debounceExtraTimeout = useRef(null);

  useEffect(() => {
    const onLangChange = (lng) => setLang(lng);
    i18n.on('languageChanged', onLangChange);
    return () => i18n.off('languageChanged', onLangChange);
  }, [i18n]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Speech-to-text logic
  let recognition;
  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
  }

  const handleMicClick = () => {
    if (!recognition) return;
    setListening(true);
    recognition.start();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSymptoms(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLang(lng);
    if (recognition) {
      recognition.lang = lng === 'en' ? 'en-US' : 
                       lng === 'es' ? 'es-ES' : 
                       lng === 'de' ? 'de-DE' :
                       lng === 'fr' ? 'fr-FR' :
                       lng === 'hi' ? 'hi-IN' :
                       lng === 'zh' ? 'zh-CN' :
                       lng === 'sw' ? 'sw-KE' : 'en-US';
    }
  };

  const handleReset = () => {
    setSymptoms("");
    setPrediction(null);
    setError(null);
    setLastResponse(null);
    setNeedMoreInfo(false);
    setAccumulatedSymptoms([]);
    setExtra("");
    setBackendMessage(null);
    setDescription(null);
    setMedicines(null);
    setConfidence(null);
    setMultiPredictions([]);
  };

  // Debounced extraction as user types
  useEffect(() => {
    if (!symptoms.trim()) {
      setExtractedSymptoms([]);
      return;
    }
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.post("http://127.0.0.1:8000/extract_symptoms_medspacy", { text: symptoms });
        if (Array.isArray(res.data.symptoms)) {
          setExtractedSymptoms(res.data.symptoms);
        } else {
          setExtractedSymptoms([]);
        }
      } catch {
        setExtractedSymptoms([]);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(debounceTimeout.current);
  }, [symptoms]);

  // Debounced extraction for extra (more info)
  useEffect(() => {
    if (!extra.trim()) {
      setExtractedExtraSymptoms([]);
      return;
    }
    if (debounceExtraTimeout.current) clearTimeout(debounceExtraTimeout.current);
    debounceExtraTimeout.current = setTimeout(async () => {
      try {
        const res = await axios.post("http://127.0.0.1:8000/extract_symptoms_medspacy", { text: extra });
        if (Array.isArray(res.data.symptoms)) {
          setExtractedExtraSymptoms(res.data.symptoms);
        } else {
          setExtractedExtraSymptoms([]);
        }
      } catch {
        setExtractedExtraSymptoms([]);
      }
    }, 400);
    return () => clearTimeout(debounceExtraTimeout.current);
  }, [extra]);

  // When user submits, merge extracted symptoms from both fields into accumulatedSymptoms
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setPrediction(null);
    setIsLoading(true);

    // Merge all symptoms (accumulated + extracted from both fields)
    let allSymptoms = new Set(accumulatedSymptoms);
    extractedSymptoms.forEach(s => allSymptoms.add(s));
    extractedExtraSymptoms.forEach(s => allSymptoms.add(s));
    const uniqueSymptoms = Array.from(allSymptoms);
    try {
      const response = await axios.post("http://127.0.0.1:8000/predict", {
        symptoms: uniqueSymptoms.join(", "),
        extra: ""
      });
      setLastResponse(response);
      // Only update accumulatedSymptoms if user submitted more info
      setAccumulatedSymptoms(uniqueSymptoms);
      if (response.data.need_more_info && !response.data.predictions) {
        setNeedMoreInfo(true);
        setBackendMessage(response.data.message);
        // Do NOT clear extra or tags here
        setPrediction(null);
        setMultiPredictions([]);
      } else if (response.data.predictions) {
        setPrediction(null);
        setBackendMessage(response.data.message || "");
        setNeedMoreInfo(response.data.need_more_info || false);
        setDescription("");
        setMedicines("");
        setConfidence(1.0);
        setSymptoms("");
        // Do NOT clear extra or accumulatedSymptoms here
        setMultiPredictions(response.data.predictions);
      } else if (response.data.prediction) {
        setPrediction(response.data.prediction);
        setBackendMessage("");
        setNeedMoreInfo(false);
        setDescription(response.data.description);
        setMedicines(response.data.medicines);
        setConfidence(response.data.confidence);
        setSymptoms("");
        setExtra("");
        setAccumulatedSymptoms([]);
        setMultiPredictions([]);
        setLastResponse(null);
      }
      setIsLoading(false);
    } catch (err) {
      setError(
        err.response?.data?.message || "An error occurred. Please try again."
      );
      setIsLoading(false);
    }
  };

  const handleFeedback = async (wasCorrect) => {
    try {
      await axios.post("http://127.0.0.1:8000/feedback", {
        symptoms: Array.from(new Set([...accumulatedSymptoms, ...symptoms.split(',').map(s => s.trim())])).join(", "),
        disease: prediction,
        correct: wasCorrect
      });
      setFeedbackSubmitted(true);
      setTimeout(() => setFeedbackSubmitted(false), 3000); // Reset after 3 seconds
    } catch (err) {
      setError("Failed to send feedback. Please try again.");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const removeSymptom = (symptomToRemove) => {
    const updatedSymptoms = symptoms
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== symptomToRemove)
      .join(', ');
    setSymptoms(updatedSymptoms);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="App">
        <header className="App-header">
          {/* Theme toggle button */}
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? t('switch_to_dark') : t('switch_to_light')}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Language selector */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 1000
          }}>
            <select
              onChange={(e) => changeLanguage(e.target.value)}
              value={lang}
              style={{
                padding: '8px',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--text-secondary)',
                backgroundColor: 'var(--background-primary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="hi">हिंदी</option>
              <option value="sw">Kiswahili</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <h1 style={{
            color: theme === 'light' ? 'white' : 'var(--text-primary)',
            marginBottom: '24px',
            fontSize: '2.5rem',
            fontWeight: '700',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {t('title')}
          </h1>

          {/* Main form */}
          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            background: 'var(--background-primary)',
            borderRadius: 'var(--border-radius)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            padding: 24,
            width: 350,
            maxWidth: '90vw'
          }}>
            <label style={{width: '100%', color: 'var(--text-primary)', fontWeight: 500}}>
              {t('enter_symptoms')}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                background: 'var(--background-secondary)',
                borderRadius: 'var(--border-radius)',
                padding: '2px 8px',
                width: '100%',
                border: '1px solid var(--text-secondary)'
              }}>
                <input
                  type="text"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder={t('symptoms_placeholder')}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: 14,
                    padding: '8px 0'
                  }}
                />
                <button 
                  type="button" 
                  onClick={handleMicClick} 
                  title={t('speak_symptoms')}
                  className={listening ? 'mic-active' : ''}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                    <path 
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8 1C6.34315 1 5 2.34315 5 4V8C5 9.65685 6.34315 11 8 11C9.65685 11 11 9.65685 11 8V4C11 2.34315 9.65685 1 8 1ZM3.5 7.5C3.5 7.22386 3.27614 7 3 7C2.72386 7 2.5 7.22386 2.5 7.5C2.5 10.5376 4.96243 13 8 13C11.0376 13 13.5 10.5376 13.5 7.5C13.5 7.22386 13.2761 7 13 7C12.7239 7 12.5 7.22386 12.5 7.5C12.5 9.98528 10.4853 12 8 12C5.51472 12 3.5 9.98528 3.5 7.5ZM7 14C7 13.7239 7.22386 13.5 7.5 13.5H8.5C8.77614 13.5 9 13.7239 9 14V15C9 15.2761 8.77614 15.5 8.5 15.5H7.5C7.22386 15.5 7 15.2761 7 15V14Z"
                      fill={listening ? "var(--primary-color)" : "var(--text-secondary)"}
                    />
                  </svg>
                </button>
              </div>
            </label>

            {/* Symptom tags */}
            {(extractedSymptoms.length > 0 || extractedExtraSymptoms.length > 0 || accumulatedSymptoms.length > 0) && (
              <div className="symptom-tags">
                {[...new Set([...accumulatedSymptoms, ...extractedSymptoms, ...extractedExtraSymptoms])].map((symptom, idx) => (
                  <SymptomTag
                    key={symptom + idx}
                    symptom={symptom}
                    onRemove={() => {
                      // Remove from all sources
                      setExtractedSymptoms(extractedSymptoms.filter((s) => s !== symptom));
                      setExtractedExtraSymptoms(extractedExtraSymptoms.filter((s) => s !== symptom));
                      setAccumulatedSymptoms(accumulatedSymptoms.filter((s) => s !== symptom));
                    }}
                  />
                ))}
              </div>
            )}

            {needMoreInfo && (
              <label style={{width: '100%', color: 'var(--text-primary)', fontWeight: 500, marginTop: 8}}>
                {t('add_more_info')}:
                <input
                  type="text"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={t('more_info_placeholder')}
                  style={{
                    width: '100%',
                    background: 'var(--background-secondary)',
                    border: '1px solid var(--text-secondary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--border-radius)',
                    padding: '8px',
                    marginTop: 4,
                    fontSize: 14
                  }}
                  autoFocus
                />
              </label>
            )}

            <div style={{display: 'flex', gap: 10, marginTop: 8}}>
              <button
                type="submit"
                style={{
                  background: 'var(--primary-color)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = 'var(--secondary-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'var(--primary-color)';
                }}
              >
                {isLoading ? <Spinner /> : t('predict')}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: 'var(--background-secondary)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: 'var(--border-radius)',
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'var(--background-secondary)';
                }}
              >
                {t('reset')}
              </button>
            </div>
          </form>

          {/* Messages and Results */}
          {backendMessage && (
            <div className="info" style={{marginTop: 10, color: 'var(--primary-color)'}}>
              <b>{t('info')}:</b> {backendMessage}
            </div>
          )}

          {prediction && (
            <div className="result-card">
              <h2 style={{ color: 'var(--text-primary)' }}>{t('prediction')}:</h2>
              <p style={{ fontSize: '1.2em', color: theme === 'light' ? '#1976d2' : 'var(--primary-color)', fontWeight: 'bold' }}>
                {prediction}
              </p>

              <div className="confidence-indicator">
                <span className="label" style={{ color: 'var(--text-primary)' }}>{t('confidence')}:</span>
                <ProgressBar value={confidence * 100} />
                <span style={{ color: 'var(--text-primary)' }}>{(confidence * 100).toFixed(1)}%</span>
              </div>

              <CollapsibleSection
                title={t('description')}
                isOpen={expandedSections.description}
                onToggle={() => toggleSection('description')}
              >
                <div style={{ color: 'var(--text-primary)' }}>{description}</div>
              </CollapsibleSection>

              {medicines && (
                <CollapsibleSection
                  title={t('medicines')}
                  isOpen={expandedSections.medicines}
                  onToggle={() => toggleSection('medicines')}
                >
                  <div style={{ color: 'var(--text-primary)' }}>{medicines}</div>
                </CollapsibleSection>
              )}

              {/* Feedback section */}
              {!feedbackSubmitted && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: 'var(--background-secondary)',
                  borderRadius: 'var(--border-radius)'
                }}>
                  <p style={{
                    fontWeight: 500,
                    marginBottom: '10px',
                    color: 'var(--text-primary)'
                  }}>
                    {t('was_prediction_helpful')}
                  </p>
                  <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                    <button
                      onClick={() => handleFeedback(true)}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--success-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--border-radius)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {t('yes')}
                    </button>
                    <button
                      onClick={() => handleFeedback(false)}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--error-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--border-radius)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {t('no')}
                    </button>
                  </div>
                </div>
              )}

              {feedbackSubmitted && (
                <div style={{
                  marginTop: '15px',
                  color: 'var(--success-color)',
                  fontWeight: '500'
                }}>
                  {t('feedback_thank_you')}
                </div>
              )}
            </div>
          )}

          {multiPredictions && multiPredictions.length > 0 && (
            <div className="result-card">
              <h2 style={{ color: 'var(--text-primary)' }}>{t('possible_conditions', 'Possible Conditions')}:</h2>
              {multiPredictions.map((pred, index) => (
                <div key={index} className="prediction-item" style={{ 
                  padding: '15px',
                  margin: '10px 0',
                  borderRadius: 'var(--border-radius)',
                  background: 'var(--background-secondary)',
                  color: 'var(--text-primary)'
                }}>
                  <div style={{ 
                    fontSize: '1.1em',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: theme === 'light' ? '#1976d2' : 'var(--primary-color)'
                  }}>
                    {pred.disease}
                  </div>
                  <div className="confidence-indicator">
                    <span className="label" style={{ color: 'var(--text-primary)' }}>{t('match', 'Match')}:</span>
                    <ProgressBar value={pred.percent_overlap} />
                    <span style={{ color: 'var(--text-primary)' }}>{pred.percent_overlap}%</span>
                  </div>
                  <CollapsibleSection
                    title={t('description')}
                    isOpen={expandedSections.description}
                    onToggle={() => toggleSection('description')}
                  >
                    <div style={{ color: 'var(--text-primary)' }}>{pred.description}</div>
                  </CollapsibleSection>
                  {pred.medicines && (
                    <CollapsibleSection
                      title={t('medicines')}
                      isOpen={expandedSections.medicines}
                      onToggle={() => toggleSection('medicines')}
                    >
                      <div style={{ color: 'var(--text-primary)' }}>{pred.medicines}</div>
                    </CollapsibleSection>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="error" style={{
              background: 'var(--error-color)',
              color: 'white',
              padding: '10px',
              borderRadius: 'var(--border-radius)',
              marginTop: '20px'
            }}>
              <b>{t('error')}</b> {error}
            </div>
          )}
        </header>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
