# MSK Assistant Server

FastAPI backend server for the MSK Young Adult Journey chatbot, integrating with Databricks Claude Sonnet endpoint.

## Features

- **FastAPI** - Modern, fast Python web framework
- **Databricks Integration** - Connects to Claude Sonnet via Databricks serving endpoint
- **LangChain** - Manages conversation history and context
- **Multi-language Support** - English, Spanish, Arabic, Chinese, Portuguese
- **Session Management** - Persistent chat sessions with history
- **Health Monitoring** - Health checks for all services

## Quick Start

1. **Install dependencies**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Databricks credentials:
   ```env
   DATABRICKS_PAT=your_personal_access_token
   DATABRICKS_ENDPOINT=https://msk-mode-prod.cloud.databricks.com/serving-endpoints/databricks-claude-sonnet-4/invocations
   ```

3. **Run the server**
   ```bash
   python main.py
   ```
   
   Or for development with auto-reload:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

4. **Test the API**
   - Health check: `http://localhost:8000/health`
   - API docs: `http://localhost:8000/docs`
   - OpenAPI schema: `http://localhost:8000/openapi.json`

## API Endpoints

### Chat Endpoints

- `POST /api/chat/message` - Send a message to the assistant
- `GET /api/chat/history?session_id={id}` - Get chat history
- `DELETE /api/chat/session/{session_id}` - Clear session history

### Session Endpoints

- `POST /api/session/new` - Create a new chat session
- `POST /api/session/locale` - Set session language preference
- `GET /api/session/{session_id}/info` - Get session information
- `DELETE /api/session/{session_id}` - Delete a session
- `GET /api/session/stats` - Get session statistics (admin)
- `POST /api/session/cleanup` - Clean up old sessions (admin)

### Example Usage

**Create a new session:**
```bash
curl -X POST "http://localhost:8000/api/session/new" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
```

**Send a message:**
```bash
curl -X POST "http://localhost:8000/api/chat/message" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "your-session-id",
    "message": "How do I schedule an appointment?",
    "language": "en"
  }'
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8000 |
| `HOST` | Server host | 0.0.0.0 |
| `ENVIRONMENT` | Environment (development/production) | development |
| `DATABRICKS_PAT` | Databricks Personal Access Token | Required |
| `DATABRICKS_ENDPOINT` | Databricks Claude endpoint URL | Required |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |

## Architecture

```
server/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── models/
│   └── chat_models.py     # Pydantic models for API
├── routers/
│   ├── chat.py            # Chat-related endpoints
│   └── session.py         # Session management endpoints
└── services/
    ├── databricks_service.py    # Databricks/Claude integration
    └── chat_history_service.py  # LangChain-based history management
```

## Language Support

The server supports responses in multiple languages:

- **English (en)** - Default
- **Spanish (es)** - Español
- **Arabic (ar)** - العربية (RTL support)
- **Chinese (zh)** - 中文
- **Portuguese (pt)** - Português

Language is controlled via the `language` parameter in chat requests.

## Error Handling

The server provides detailed error responses with appropriate HTTP status codes:

- `400` - Bad Request (invalid input)
- `404` - Not Found (session not found)
- `503` - Service Unavailable (Databricks connection issues)
- `500` - Internal Server Error

## Development

### Running Tests
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

### Code Quality
```bash
# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .
```

### Production Deployment

1. Set `ENVIRONMENT=production`
2. Use a production WSGI server like Gunicorn:
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```
3. Set up proper logging and monitoring
4. Use Redis for session storage instead of in-memory
5. Configure proper CORS origins
6. Set up SSL/TLS termination

## Monitoring

- Health check endpoint: `/health`
- Session statistics: `/api/session/stats`
- Detailed logging with timestamps and request IDs
- Error tracking and performance metrics

## Security

- CORS protection
- Input validation with Pydantic
- No PII storage in logs
- Secure error messages in production

---

For integration with the frontend, update the client's API endpoints to point to this server (default: `http://localhost:8000`).
