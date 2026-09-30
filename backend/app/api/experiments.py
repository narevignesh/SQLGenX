from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.evaluation.metrics import EvaluationEngine
from app.evaluation.benchmark import BENCHMARK_DATASET

router = APIRouter(prefix="/mlops", tags=["MLOps & Evaluation"])

class BenchmarkRunRequest(BaseModel):
    pipeline_mode: str = Field(default="full_agent", description="llm_only, llm_rag, llm_rag_validator, full_agent")
    provider: Optional[str] = "fallback"

@router.get("/benchmark-dataset")
async def get_benchmark_dataset():
    """Returns the benchmark test cases."""
    return BENCHMARK_DATASET

@router.get("/experiments")
async def get_experiments():
    """Returns all recorded MLOps benchmark runs."""
    return EvaluationEngine.get_experiments_history()

@router.post("/run-benchmark")
async def run_benchmark(req: BenchmarkRunRequest):
    """Executes the benchmark evaluation suite and calculates factual metrics."""
    result = EvaluationEngine.run_benchmark_suite(
        pipeline_mode=req.pipeline_mode,
        provider=req.provider or "fallback"
    )
    return result

@router.post("/run-all-comparisons")
async def run_all_comparisons():
    """Runs all 4 pipeline modes across benchmark dataset for side-by-side comparison."""
    modes = ["llm_only", "llm_rag", "llm_rag_validator", "full_agent"]
    results = []
    for m in modes:
        res = EvaluationEngine.run_benchmark_suite(pipeline_mode=m)
        results.append(res)
    return results
