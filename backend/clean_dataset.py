# clean_dataset.py
# Utility script to clean and preprocess disease-symptom datasets for ML training
import pandas as pd
import os

def clean_symptom_string(symptom_str):
    if pd.isna(symptom_str):
        return ''
    return ', '.join(sorted(set(s.strip().lower() for s in str(symptom_str).split(',') if s.strip())))

def clean_file(input_path, output_path):
    df = pd.read_excel(input_path)
    if 'symptoms' in df.columns:
        df['symptoms'] = df['symptoms'].apply(clean_symptom_string)
    df = df.drop_duplicates()
    df.to_csv(output_path, index=False)
    print(f"Cleaned data saved to {output_path}")

if __name__ == "__main__":
    # Example: clean all Excel files in the backend folder
    for fname in os.listdir('.'):
        if fname.endswith('.xlsx'):
            outname = fname.replace('.xlsx', '_cleaned.csv')
            clean_file(fname, outname)
