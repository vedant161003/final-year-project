# 🚀 Traefik Clone

A lightweight, modern reverse proxy and load balancer clone built with Node.js and React. This project provides an intuitive web interface for managing Docker containers and routing traffic dynamically.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- 🔄 Dynamic Docker container discovery and routing
- 🌐 Automatic subdomain creation for containers
- 📊 Real-time container monitoring
- 📝 Comprehensive logging system
- 🎯 User-friendly web interface
- 🔌 WebSocket support
- 🔒 Configurable security settings

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- Docker API
- HTTP-Proxy

### Frontend
- React
- React Router
- Recharts
- Tailwind CSS
- Lucide Icons

## 🚀 Getting Started

### Prerequisites

- Docker
- Node.js (>= 14.x)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pratikni07/Traefik---Docker-Reverse-Proxy.git
cd traefik-clone
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=8080
PROXY_PORT=80
```

4. Start the application using Docker Compose:
```bash
docker-compose up
```

The application will be available at:
- Management UI: `http://localhost:8080`
- Reverse Proxy: `http://localhost:80`

## 🏗️ Project Structure

```
traefik-clone/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.js
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## 💻 Usage

### Creating a Container

1. Navigate to the Containers page
2. Click "Create New Container"
3. Enter container details:
   - Image name (e.g., `nginx`)
   - Tag (e.g., `latest`)
   - Container name (e.g., `my-web-app`)
4. Click "Create Container"

Your container will be accessible at: `http://<container-name>.localhost`

### Monitoring

The Dashboard provides real-time metrics including:
- Active containers
- Total images
- Container events
- System uptime
- Memory usage
