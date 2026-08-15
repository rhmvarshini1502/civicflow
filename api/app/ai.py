import json
import re
import requests
from typing import Dict, Any, Optional

from .config import settings

def keyword_fallback_classifier(description: str) -> Dict[str, Any]:
    """
    Local rule-based classifier that extracts categories, severity, priority, 
    and departments from description text using regular expressions.
    Used when the Gemini API key is unavailable or the API call fails.
    """
    desc_lower = description.lower()
    
    # Initialize defaults
    category = "Other"
    severity = "Medium"
    summary = "Civic complaint reported by citizen"
    suggested_department = "General Administration"
    priority = 30
    
    # Category detection rules
    if any(k in desc_lower for k in ["pothole", "cracked road", "road crack", "crater"]):
        category = "Pothole"
        severity = "High"
        summary = "Road pothole creating safety risk"
        suggested_department = "Road Maintenance"
        priority = 75
    elif any(k in desc_lower for k in ["garbage", "trash", "waste", "litter", "rubbish", "refuse"]):
        category = "Garbage"
        severity = "Medium"
        summary = "Accumulated garbage causing unhygienic conditions"
        suggested_department = "Sanitation & Waste Management"
        priority = 50
    elif any(k in desc_lower for k in ["street light", "streetlight", "lamp", "dark street", "broken light"]):
        category = "Streetlight"
        severity = "Medium"
        summary = "Broken streetlight causing low visibility"
        suggested_department = "Public Lighting & Electricity"
        priority = 45
    elif any(k in desc_lower for k in ["manhole", "open hole", "drain cover missing", "missing lid"]):
        category = "Open Manhole"
        severity = "Critical"
        summary = "Open manhole creating extreme hazard for pedestrians and traffic"
        suggested_department = "Road Maintenance"
        priority = 95
    elif any(k in desc_lower for k in ["leakage", "water leak", "pipe burst", "flowing water", "pipe leak"]):
        category = "Water Leakage"
        severity = "High"
        summary = "Water pipe leakage causing wastage and damage"
        suggested_department = "Water & Sewerage"
        priority = 70
    elif any(k in desc_lower for k in ["drainage", "sewage", "overflow", "blocked drain", "clogged drain"]):
        category = "Drainage"
        severity = "High"
        summary = "Sewage drainage overflow causing foul smell and health hazard"
        suggested_department = "Water & Sewerage"
        priority = 80
    elif any(k in desc_lower for k in ["traffic light", "traffic signal", "signal broken", "blinking red"]):
        category = "Traffic Signal"
        severity = "High"
        summary = "Malfunctioning traffic signal disruption traffic flow"
        suggested_department = "Traffic Engineering"
        priority = 85
    elif any(k in desc_lower for k in ["road damage", "damaged road", "caving", "sinkhole"]):
        category = "Road Damage"
        severity = "High"
        summary = "Damaged road section needing repair"
        suggested_department = "Road Maintenance"
        priority = 65
    elif any(k in desc_lower for k in ["illegal dumping", "dumping debris", "dumping waste"]):
        category = "Illegal Dumping"
        severity = "Medium"
        summary = "Illegal dumping of debris/waste in public space"
        suggested_department = "Sanitation & Waste Management"
        priority = 55
    else:
        # Default fallback categorization
        category = "Other"
        severity = "Low"
        summary = description[:50] + "..." if len(description) > 50 else description
        suggested_department = "General Administration"
        priority = 30

    # Adjust severity based on urgency keywords
    if any(k in desc_lower for k in ["urgent", "emergency", "danger", "hazard", "accident", "injured"]):
        severity = "Critical" if severity == "High" else "High"
        priority = min(priority + 15, 100)
    elif any(k in desc_lower for k in ["slow", "minor", "not urgent"]):
        severity = "Low"
        priority = max(priority - 15, 15)

    return {
        "category": category,
        "severity": severity,
        "summary": summary,
        "suggested_department": suggested_department,
        "priority": priority
    }

def analyze_complaint(description: str, image_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Main entry point for AI analysis. Attempts to call the Gemini API.
    Falls back to a keyword classifier if key is missing or HTTP request fails.
    """
    if not settings.GEMINI_API_KEY:
        # Silently fallback to rule-based analysis
        return keyword_fallback_classifier(description)
        
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        system_prompt = (
            "You are the CivicFlow AI Engine. Classify the citizen civic complaint description. "
            "You MUST respond ONLY with a JSON object containing the exact keys: "
            '"category" (string), "severity" (string), "summary" (string), '
            '"suggested_department" (string), and "priority" (integer from 0 to 100).\n\n'
            "Strict categories to choose from: "
            "[Pothole, Garbage, Streetlight, Water Leakage, Drainage, Open Manhole, Traffic Signal, Road Damage, Illegal Dumping, Other].\n"
            "Strict severities to choose from: "
            "[Low, Medium, High, Critical].\n"
            "Suggested department should map logically, such as:\n"
            "- Road Maintenance (for Pothole, Road Damage, Open Manhole)\n"
            "- Sanitation & Waste Management (for Garbage, Illegal Dumping)\n"
            "- Public Lighting & Electricity (for Streetlight)\n"
            "- Water & Sewerage (for Water Leakage, Drainage)\n"
            "- Traffic Engineering (for Traffic Signal)\n"
            "- General Administration (for Other)\n\n"
            "Example JSON output:\n"
            '{"category": "Pothole", "severity": "High", "summary": "Large pothole in middle of lane", "suggested_department": "Road Maintenance", "priority": 80}\n'
        )
        
        prompt = f'{system_prompt}\nCitizen Complaint Description: "{description}"'
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        headers = {'Content-Type': 'application/json'}
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            result_json = response.json()
            text_response = result_json['contents'][0]['parts'][0]['text']
            parsed_data = json.loads(text_response.strip())
            
            # Basic key validation
            required_keys = ["category", "severity", "summary", "suggested_department", "priority"]
            if all(key in parsed_data for key in required_keys):
                return parsed_data
                
        # If any validation or request fails, trigger fallback
        return keyword_fallback_classifier(description)
        
    except Exception:
        # Fallback in case of networking error, JSON parse error, etc.
        return keyword_fallback_classifier(description)
