import re
import difflib
import csv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import logging
import medspacy

# Load medspaCy pipeline (default clinical NER, no UMLS)
medspacy_nlp = medspacy.load()

# Common layman-to-medical synonym mapping (expand as needed)
SYMPTOM_SYNONYMS = {
    "tummy ache": "abdominal pain",
    "runny nose": "rhinorrhea",
    "stuffy nose": "nasal congestion",
    "high temperature": "fever",
    "throwing up": "vomiting",
    "upset stomach": "nausea",
    "sore throat": "pharyngitis",
    # Add more as needed
}

# Logging configured by James to print logs to the console for backend predictions
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define a Pydantic model for user input
class HealthInput(BaseModel):
    symptoms: str
    extra: str = None

class FeedbackInput(BaseModel):
    symptoms: str
    disease: str
    correct: bool

class TextInput(BaseModel):
    text: str

# Load the data
data = pd.read_csv('symptom_disease.csv')

def extract_symptoms(symptom_str):
    if not symptom_str or not isinstance(symptom_str, str):
        return set()
      # If empty string, return empty set
    if not symptom_str.strip():
        return set()
        
    entities = set()
    # Try biomedical entity extraction first, silently fall back if it fails
    try:
        doc = biomed_nlp(symptom_str)
        for sent in doc.sentences:
            if sent and hasattr(sent, 'ents'):
                # Extract entities
                entities.update(
                    ent.text.lower().strip() 
                    for ent in sent.ents 
                    if ent and hasattr(ent, 'text')
                )
                
                # Look for symptom patterns in dependencies
                if hasattr(sent, 'words'):
                    entities.update(
                        word.text.lower().strip()
                        for word in sent.words
                        if hasattr(word, 'upos') and hasattr(word, 'deps')
                        and word.upos in ['NOUN', 'ADJ']
                        and any(hasattr(dep, 'deprel') and dep.deprel in ['nsubj', 'nmod', 'amod'] 
                               for dep in word.deps)
                        and word.text
                    )
    except:
        pass  # Silently fall back to text splitting

    # If no entities found or too few, use intelligent text splitting
    if len(entities) < 2:
        text = symptom_str.lower()
        # Handle common natural language patterns
        patterns = [
            " and ", " & ", " with ", " plus ", " as well as ",
            " accompanied by ", " along with ", " including ",
            " also ", " in addition to "
        ]
        for pattern in patterns:
            text = text.replace(pattern, ", ")
        
        # Clean up various separators
        for sep in [";", ".", "/", "|", ":", "-"]:
            text = text.replace(sep, ",")
            
        # Split and clean up the symptoms
        potential_symptoms = []
        for part in text.split(","):
            clean_part = part.strip()
            if clean_part:
                if clean_part.startswith("i have "):
                    clean_part = clean_part[7:]
                if clean_part.startswith("experiencing "):
                    clean_part = clean_part[12:]
                if clean_part.startswith("suffering from "):
                    clean_part = clean_part[14:]
                potential_symptoms.append(clean_part.strip())
        
        entities.update(potential_symptoms)
    
    # Remove any empty or too short items
    entities = {e for e in entities if e and len(e) > 2}
    
    return entities or {"headache", "fever", "chills"}  # Fallback to common symptoms if nothing is found

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI-Powered Healthcare Assistant API!"}

@app.post("/predict")
def predict_health(input: HealthInput):
    logging.info(f"Received symptoms: {input.symptoms}")
    try:
        # Extract symptoms from both initial input and any extra info
        initial_symptoms = extract_symptoms(input.symptoms)
        extra_symptoms = extract_symptoms(input.extra) if input.extra else set()
        
        # Combine all unique symptoms
        all_symptoms = initial_symptoms | extra_symptoms
        
        # Ensure we have enough symptoms for a meaningful prediction
        if len(all_symptoms) < 2:
            return {
                "need_more_info": True,
                "message": "Please provide more detailed symptoms for a more accurate prediction. You can describe them in natural language."
            }

        # Match against our disease database
        filtered = []
        for idx, row in data.iterrows():
            disease_symptoms = extract_symptoms(row['symptoms'])
            # Calculate overlap metrics
            common_symptoms = all_symptoms & disease_symptoms
            overlap_ratio = len(common_symptoms) / len(disease_symptoms)
            
            if overlap_ratio >= 0.5:  # Consider matches with at least 50% overlap
                filtered.append({
                    'row': row,
                    'overlap': overlap_ratio,
                    'common': common_symptoms,
                    'missing': disease_symptoms - all_symptoms,
                    'extra': all_symptoms - disease_symptoms
                })

        # Sort by overlap ratio
        filtered.sort(key=lambda x: x['overlap'], reverse=True)

        if not filtered:
            return {
                "need_more_info": True,
                "message": "No matching diseases found. Please provide more specific symptoms or rephrase them."
            }

        # If we have a very good match
        if filtered[0]['overlap'] > 0.8:
            best = filtered[0]['row']
            return {
                "symptoms": ", ".join(all_symptoms),
                "prediction": best['disease'],
                "description": best['description'] if 'description' in best else "No description available",
                "medicines": best['medicines'] if 'medicines' in best else "No medicines available",
                "confidence": filtered[0]['overlap'],
                "missing_symptoms": list(filtered[0]['missing']),
                "extra_symptoms": list(filtered[0]['extra'])
            }

        # Return multiple candidates if no clear single match
        candidates = []
        for match in filtered[:5]:  # Show top 5 matches
            candidates.append({
                "disease": match['row']['disease'],
                "description": match['row']['description'] if 'description' in match['row'] else "No description available",
                "medicines": match['row']['medicines'] if 'medicines' in match['row'] else "No medicines available",
                "percent_overlap": round(match['overlap'] * 100, 1),
                "missing_symptoms": list(match['missing']),
                "extra_symptoms": list(match['extra'])
            })

        return {
            "need_more_info": True,
            "message": "Found several possible matches. Please provide more specific symptoms to narrow down the diagnosis.",
            "predictions": candidates
        }

    except Exception as e:
        logging.error(f"Error in predict_health: {str(e)}")
        return {"error": "An error occurred while processing your request."}

@app.post("/feedback")
async def save_feedback(feedback: FeedbackInput):
    try:
        with open('feedback.csv', 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([feedback.symptoms, feedback.disease, "Yes" if feedback.correct else "No"])
        return {"message": "Feedback saved successfully"}
    except Exception as e:
        logging.error(f"Error saving feedback: {str(e)}")
        return {"error": "An error occurred while saving your feedback"}

# Enhanced symptom extraction for non-punctuated input

def preprocess_symptom_text(text):
    # Lowercase and normalize whitespace
    text = text.lower().strip()
    # Replace common conjunctions/phrases with commas
    patterns = [
        " and ", " & ", " with ", " plus ", " as well as ",
        " accompanied by ", " along with ", " including ",
        " also ", " in addition to ", " but ", " or ", " no "
    ]
    for pattern in patterns:
        text = text.replace(pattern, ", ")
    # Clean up various separators
    for sep in [";", ".", "/", "|", ":", "-", "_", "\n"]:
        text = text.replace(sep, ",")
    # Remove duplicate commas and extra spaces
    text = re.sub(r',+', ',', text)
    text = re.sub(r'\s*,\s*', ',', text)
    return text


def extract_symptoms_medspacy(text):
    preprocessed = preprocess_symptom_text(text)
    doc = medspacy_nlp(preprocessed)
    symptoms = set()
    for ent in doc.ents:
        if ent.label_.lower() in ["problem", "symptom", "sign", "finding"]:
            symptoms.add(ent.text.lower())
    # Add synonyms
    for phrase, norm in SYMPTOM_SYNONYMS.items():
        if phrase in preprocessed:
            symptoms.add(norm)
    # Remove negated symptoms if medspacy context is available
    for ent in doc.ents:
        if hasattr(ent._, "is_negated") and ent._.is_negated:
            symptoms.discard(ent.text.lower())
    # If too few symptoms found, apply improved splitting
    if len(symptoms) < 2:
        parts = [s.strip() for s in preprocessed.split(',') if len(s.strip()) > 2]
        split_parts = []
        for part in parts:
            # If part contains multiple words, split further
            if ' ' in part:
                split_parts.extend([w.strip() for w in part.split(' ') if len(w.strip()) > 2])
            else:
                split_parts.append(part)
        symptoms.update(split_parts)
    # Remove any empty or too short items
    symptoms = {e for e in symptoms if e and len(e) > 2}
    return list(symptoms)

@app.post("/extract_symptoms_medspacy")
def extract_symptoms_medspacy_endpoint(input: TextInput):
    """
    Extract symptoms from free-form text using medspaCy clinical NLP.
    """
    try:
        symptoms = extract_symptoms_medspacy(input.text)
        return {"symptoms": symptoms}
    except Exception as e:
        return {"error": f"medspaCy error: {str(e)}"}