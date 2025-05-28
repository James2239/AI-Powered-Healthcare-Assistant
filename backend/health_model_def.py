# health_model_def.py
# Defines the PyTorch model for disease prediction based on symptoms
import torch
import torch.nn as nn

class HealthNet(nn.Module):
    def __init__(self, input_size, hidden_size=128, num_classes=10):
        super(HealthNet, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_size, num_classes)
        self.softmax = nn.Softmax(dim=1)

    def forward(self, x):
        out = self.fc1(x)
        out = self.relu(out)
        out = self.fc2(out)
        return self.softmax(out)

# Example usage:
# model = HealthNet(input_size=100, num_classes=50)
