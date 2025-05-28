# train_model.py
# Trains the HealthNet model on the cleaned symptom-disease dataset
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder
from health_model_def import HealthNet
import numpy as np

class SymptomDiseaseDataset(Dataset):
    def __init__(self, csv_file, mlb, le):
        df = pd.read_csv(csv_file)
        self.X = mlb.transform(df['symptoms'].str.split(', '))
        self.y = le.transform(df['disease'])
    def __len__(self):
        return len(self.y)
    def __getitem__(self, idx):
        return torch.tensor(self.X[idx], dtype=torch.float32), torch.tensor(self.y[idx], dtype=torch.long)

def main():
    # Load and preprocess data
    df = pd.read_csv('symptom_disease.csv')
    all_symptoms = set()
    for s in df['symptoms']:
        all_symptoms.update([x.strip().lower() for x in str(s).split(',') if x.strip()])
    mlb = MultiLabelBinarizer()
    mlb.fit([list(all_symptoms)])
    le = LabelEncoder()
    le.fit(df['disease'])
    dataset = SymptomDiseaseDataset('symptom_disease.csv', mlb, le)
    dataloader = DataLoader(dataset, batch_size=16, shuffle=True)
    # Model
    model = HealthNet(input_size=len(mlb.classes_), num_classes=len(le.classes_))
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    # Training loop
    for epoch in range(10):
        for X, y in dataloader:
            optimizer.zero_grad()
            outputs = model(X)
            loss = criterion(outputs, y)
            loss.backward()
            optimizer.step()
        print(f"Epoch {epoch+1}, Loss: {loss.item():.4f}")
    # Save model and encoders
    torch.save(model.state_dict(), 'health_model.pt')
    np.save('mlb_classes.npy', mlb.classes_)
    np.save('le_classes.npy', le.classes_)
    print("Model and encoders saved.")

if __name__ == "__main__":
    main()
