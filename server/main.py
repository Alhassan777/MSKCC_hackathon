from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import time
from datetime import datetime, timedelta
import uvicorn
import os
from dotenv import load_dotenv
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from routers import chat, session
from services.databricks_service import DatabricksService
from services.chat_history_service import ChatHistoryService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global services
databricks_service = None
chat_history_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global databricks_service, chat_history_service
    
    # Startup
    logger.info("🚀 Starting MSK Assistant Server")
    
    # Initialize services
    try:
        databricks_service = DatabricksService()
        chat_history_service = ChatHistoryService()
        
        # Health check Databricks connection
        health = await databricks_service.health_check()
        if health["status"] == "healthy":
            logger.info("✅ Databricks connection healthy")
        else:
            logger.warning(f"⚠️ Databricks connection issues: {health.get('error')}")
        
        logger.info(f"🌐 Environment: {os.getenv('ENVIRONMENT', 'development')}")
        logger.info(f"🔗 Databricks endpoint configured")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        # Don't crash the server, let it start and handle errors per request
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down MSK Assistant Server")

# Create FastAPI app
app = FastAPI(
    title="MSK Assistant Server",
    description="Backend API for MSK Young Adult Journey Chatbot",
    version="1.0.0",
    lifespan=lifespan
)



# Add middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Dependency to get services
async def get_databricks_service():
    if databricks_service is None:
        raise HTTPException(status_code=503, detail="Databricks service not available")
    return databricks_service

async def get_chat_history_service():
    if chat_history_service is None:
        raise HTTPException(status_code=503, detail="Chat history service not available")
    return chat_history_service

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        db_health = await databricks_service.health_check() if databricks_service else {"status": "not_initialized"}
        
        return {
            "status": "OK",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "MSK Assistant Server",
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "databricks": db_health
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "ERROR",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )

# Include routers
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(session.router, prefix="/api/session", tags=["session"])

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    
    # Don't leak error details in production
    is_development = os.getenv("ENVIRONMENT", "development") == "development"
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if is_development else "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
    )

# 404 handler
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "path": str(request.url),
            "method": request.method,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    
    logger.info(f"🚀 Starting server on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
        access_log=True
    )
