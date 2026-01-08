const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Analyze crop image using ML service with multi-modal features
 * Passes all features (crop type, stage, weather, soil) for crop-specific learning
 */
async function analyzeCropImageWithML(imagePath, cropType = 'Unknown', cropStage = null, latitude = null, longitude = null, weather = null, soil = null) {
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('cropType', cropType);
    
    // Add crop stage if available
    if (cropStage) {
      formData.append('cropStage', cropStage);
    }
    
    // Add weather features if available
    if (weather) {
      if (weather.temp !== undefined) formData.append('temperature', weather.temp.toString());
      if (weather.humidity !== undefined) formData.append('humidity', weather.humidity.toString());
      if (weather.rain !== undefined) formData.append('rainfall', weather.rain.toString());
    }
    
    // Add location for weather lookup if needed
    if (latitude !== null && longitude !== null) {
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
    }
    
    // Add soil features if available
    if (soil) {
      if (soil.ph !== undefined) formData.append('soilPh', soil.ph.toString());
      if (soil.moisture !== undefined) formData.append('soilMoisture', soil.moisture.toString());
    }
    
    const response = await axios.post(`${ML_SERVICE_URL}/analyze`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000 // 30 seconds timeout
    });
    
    if (response.data && response.data.success) {
      return {
        healthStatus: response.data.healthStatus,
        confidence: response.data.confidence,
        issues: response.data.issues || [],
        recommendations: response.data.recommendations || [],
        detectedDiseases: response.data.detectedDiseases || [],
        analysis: response.data.analysis || {}
      };
    } else {
      throw new Error('ML service returned invalid response');
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.warn('ML service not available, falling back to rule-based analysis');
      return null; // Signal to fall back to rule-based
    }
    console.error('ML service error:', error.message);
    throw error;
  }
}

/**
 * Check if ML service is available
 */
async function checkMLServiceHealth() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000
    });
    return response.data && response.data.model_loaded === true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  analyzeCropImageWithML,
  checkMLServiceHealth
};

