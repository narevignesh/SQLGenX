import os
import logging
import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Any, List
from sklearn.ensemble import RandomForestClassifier
from app.ml.features import SQLFeatureExtractor
from app.config import settings

logger = logging.getLogger(__name__)

CLASS_NAMES = ["LOW", "MEDIUM", "HIGH"]

class SQLRiskModel:
    _instance = None
    
    def __init__(self):
        self.model: RandomForestClassifier = None
        self.model_path = Path(settings.MODEL_DIR) / "sql_risk_rf.joblib"
        self._load_or_train()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = SQLRiskModel()
        return cls._instance

    def _load_or_train(self):
        try:
            if self.model_path.exists():
                self.model = joblib.load(self.model_path)
                logger.info(f"Loaded existing SQL Risk ML model from {self.model_path}")
            else:
                logger.info("No saved risk model found. Training initial model...")
                from app.ml.train import train_and_save_model
                self.model = train_and_save_model(str(self.model_path))
        except Exception as e:
            logger.error(f"Error initializing risk model: {e}. Falling back to default training.")
            from app.ml.train import train_and_save_model
            self.model = train_and_save_model(str(self.model_path))

    def predict_risk(self, sql: str) -> Dict[str, Any]:
        features = SQLFeatureExtractor.extract_features(sql).reshape(1, -1)
        probs = self.model.predict_proba(features)[0]
        pred_idx = int(np.argmax(probs))
        
        # Guardrail: If destructive operations exist, force HIGH
        if features[0, 1] > 0 or features[0, 0] == 0:
            pred_idx = 2
            probs = np.array([0.0, 0.05, 0.95])
            
        risk_level = CLASS_NAMES[pred_idx]
        confidence = float(probs[pred_idx])
        
        reasons = SQLFeatureExtractor.explain_risk_reasons(sql, risk_level)
        feature_names = SQLFeatureExtractor.get_feature_names()
        
        # Feature importances
        importances = {}
        if hasattr(self.model, "feature_importances_"):
            for name, imp, val in zip(feature_names, self.model.feature_importances_, features[0]):
                importances[name] = {"importance": round(float(imp), 4), "value": round(float(val), 2)}

        return {
            "level": risk_level,
            "confidence": round(confidence, 4),
            "probabilities": {
                "LOW": round(float(probs[0]), 4),
                "MEDIUM": round(float(probs[1]), 4),
                "HIGH": round(float(probs[2]), 4)
            },
            "reasons": reasons,
            "feature_breakdown": importances
        }

risk_classifier = SQLRiskModel.get_instance()
