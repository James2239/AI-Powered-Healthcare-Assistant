import React, { useState, useRef, useEffect } from 'react';
import './AutoComplete.css';

const SYMPTOM_SUGGESTIONS = [
  'fever', 'cough', 'headache', 'fatigue', 'nausea', 'vomiting', 'sore throat',
  'runny nose', 'shortness of breath', 'chest pain', 'abdominal pain', 'diarrhea',
  'joint pain', 'muscle pain', 'rash', 'dizziness', 'palpitations', 'swelling',
  'weight loss', 'night sweats', 'loss of appetite', 'itching', 'blurred vision',
  'back pain', 'constipation', 'anxiety', 'depression', 'insomnia', 'chills',
  'sneezing', 'ear pain', 'hearing loss', 'hair loss', 'dry mouth', 'mouth ulcers',
  'vomiting blood', 'blood in stool', 'urinary frequency', 'urinary pain', 'yellow skin',
  'red eyes', 'difficulty swallowing', 'memory loss', 'confusion', 'tremor', 'seizures',
  'fainting', 'numbness', 'tingling', 'weakness', 'swollen glands', 'nosebleed',
  'difficulty breathing', 'wheezing', 'loss of taste', 'loss of smell', 'sensitivity to light',
  'sensitivity to sound', 'irritability', 'crying', 'difficulty walking', 'difficulty speaking',
  'difficulty urinating', 'incontinence', 'frequent infections', 'easy bruising', 'bleeding gums',
  'enlarged lymph nodes', 'nightmares', 'hallucinations', 'paranoia', 'delusions', 'agitation',
  'restlessness', 'muscle stiffness', 'muscle cramps', 'muscle twitching', 'muscle wasting',
  'joint swelling', 'joint stiffness', 'joint redness', 'joint warmth', 'joint deformity',
  'bone pain', 'bone fractures', 'bone swelling', 'bone deformity', 'bone tenderness',
  'bone weakness', 'bone loss', 'bone infection', 'bone tumor', 'bone cyst', 'bone spur',
  'bone marrow failure', 'bone marrow suppression', 'bone marrow transplant',
];

export default function AutoComplete({ value, onChange, placeholder, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef();

  useEffect(() => {
    if (!value) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    const filtered = SYMPTOM_SUGGESTIONS.filter(s =>
      s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
    ).slice(0, 8);
    setSuggestions(filtered);
    setActiveIndex(-1);
  }, [value]);

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      setActiveIndex(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      onSelect(suggestions[activeIndex]);
      setSuggestions([]);
      setActiveIndex(-1);
      e.preventDefault();
    }
  };

  return (
    <div className="autocomplete-root">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="autocomplete-list">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={i === activeIndex ? 'active' : ''}
              onMouseDown={() => {
                onSelect(s);
                setSuggestions([]);
                setActiveIndex(-1);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
