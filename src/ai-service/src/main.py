from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

# Import routes
from routes.valuation import router as valuation_router
from routes.scoring import router as scoring_router
from routes.recommendations import router as recommendations_router

app = FastAPI(
    title="AI Real Estate Investment Service",
    description="AI-powered property valuation, scoring, and recommendations",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}

# Include routers
app.include_router(valuation_router, prefix="/api/ai/valuation", tags=["valuation"])
app.include_router(scoring_router, prefix="/api/ai/scoring", tags=["scoring"])
app.include_router(recommendations_router, prefix="/api/ai/recommendations", tags=["recommendations"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
