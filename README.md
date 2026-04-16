# 🛡️ AI Fraud Detection System

A **production-grade real-time AI-powered fraud detection system** built for hackathons and beyond.

## 🏗️ Architecture

```
┌──────────────┐     HTTP/WS      ┌──────────────────┐     HTTP     ┌──────────────────┐
│   Frontend   │ ◄──────────────► │  Node.js Backend │ ──────────► │  Python AI Svc   │
│  (any client)│                  │  Express + WS    │             │  FastAPI + ML    │
└──────────────┘                  │  Port 3000       │             │  Port 8000       │
                                  └────────┬─────────┘             └──────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │     MongoDB      │
                                  │  Transactions    │
                                  │  Alerts          │
                                  │  Feedback        │
                                  └──────────────────┘
```

### Fraud Detection Pipeline

```
Transaction → Save to DB → ┌─ ML Score (AI Service)      ─┐
                            ├─ Pattern Score (sliding window)├─► Weighted Score → Alert?
                            └─ Graph Score (network analysis)┘
                            
Formula: 0.5×ML + 0.3×Pattern + 0.2×Graph → if > 0.7 → 🚨 FRAUD
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Python** 3.8+
- **MongoDB** (local or Atlas)

### 1. AI Service (Python)

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the server (auto-trains model on first run)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Backend (Node.js)

```bash
cd backend
npm install

# Update .env with your MongoDB URI if needed
# Default: mongodb://localhost:27017/fraud_detection

npm run dev
```

## 📡 API Reference

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/transactions` | Create & analyze a transaction |
| `GET` | `/api/transactions` | List transactions (with filters) |
| `GET` | `/api/transactions/:id` | Get single transaction |
| `POST` | `/api/transactions/simulate` | Generate normal demo transactions |
| `POST` | `/api/transactions/simulate-fraud` | 🔥 Trigger fraud spike demo |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alerts` | List fraud alerts |
| `PATCH` | `/api/alerts/:id` | Update alert status |

### Feedback & Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/feedback` | Submit analyst feedback |
| `GET` | `/api/feedback` | Get all feedback |
| `GET` | `/api/stats` | System statistics |
| `GET` | `/health` | Health check |

### AI Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict` | Get ML fraud score |
| `POST` | `/train` | Retrain models |
| `GET` | `/health` | Health check |

## 🔌 WebSocket Events

Connect to `ws://localhost:3000` and subscribe:

```javascript
const socket = io('http://localhost:3000');

// Subscribe to channels
socket.emit('subscribe_alerts');
socket.emit('subscribe_transactions');

// Listen for events
socket.on('new_transaction', (tx) => console.log('New TX:', tx));
socket.on('fraud_detected', (alert) => console.log('🚨 FRAUD:', alert));
```

## 📦 Example API Calls

### Create Transaction
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_001",
    "receiverId": "merchant_001", 
    "amount": 250.00,
    "location": "New York",
    "deviceId": "iphone_14"
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "transactionId": "664a...",
    "userId": "user_001",
    "amount": 250,
    "fraudScore": 0.12,
    "isFraud": false,
    "riskLevel": "low",
    "reason": "No significant risk factors",
    "timestamp": "2026-04-16T12:00:00.000Z"
  }
}
```

### Simulate Fraud
```bash
curl -X POST http://localhost:3000/api/transactions/simulate-fraud \
  -H "Content-Type: application/json" \
  -d '{"count": 5}'
```

### ML Prediction
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 55000,
    "frequency": 20,
    "location_change": 1,
    "device_change": 1
  }'
```

## 🧠 Detection Engines

### 1. ML Engine (50% weight)
- **Isolation Forest** — unsupervised anomaly detection
- **Random Forest** — supervised classification  
- Ensemble: 60% classifier + 40% isolation forest

### 2. Pattern Engine (30% weight)
- Frequency anomaly (>5 tx/min)
- Amount anomaly (>5× user average)
- Velocity spike detection
- Time-of-day anomaly (2-5 AM)

### 3. Graph Engine (20% weight)
- Fan-out detection (sending to many recipients)
- Circular path detection (money laundering rings)
- Burst detection (rapid-fire transfers)
- Fan-in detection (many senders to one receiver)

## 🏆 Hackathon Features

- ⚡ **Real-time** — WebSocket updates on every transaction
- 🧠 **Explainability** — Human-readable fraud reasons
- 📊 **Risk Levels** — Low / Medium / High classification
- 🎮 **Demo Mode** — Simulate normal & fraud transactions
- 🔗 **Graph Analysis** — Network-based fraud detection
- 🔄 **Feedback Loop** — Analyst feedback for model retraining

## 📁 Project Structure

```
team_aizen/
├── backend/
│   ├── src/
│   │   ├── config/         # DB & WebSocket setup
│   │   ├── modules/
│   │   │   ├── transaction/ # CRUD + fraud trigger
│   │   │   ├── fraud/       # ML + Pattern + Graph engines
│   │   │   ├── alert/       # Fraud alert management
│   │   │   └── feedback/    # Analyst feedback
│   │   ├── middleware/      # Validation & rate limiting
│   │   ├── utils/           # Logger & error handler
│   │   ├── app.js           # Express config
│   │   └── server.js        # Entry point
│   ├── .env
│   └── package.json
│
├── ai-service/
│   ├── app/
│   │   ├── main.py          # FastAPI server
│   │   ├── model/           # Train & predict
│   │   └── utils/           # Preprocessing
│   ├── generate_dataset.py  # Synthetic data
│   └── requirements.txt
│
└── README.md
```

## License

MIT