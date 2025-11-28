const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { analyzeCropImageWithML } = require('./mlImageService');

/**
 * Analyze crop image for health issues
 * Tries ML model first, falls back to rule-based analysis if ML service unavailable
 */
async function analyzeCropImage(imagePath, cropType = 'Unknown') {
  // Try ML model first
  try {
    const mlResult = await analyzeCropImageWithML(imagePath, cropType);
    if (mlResult) {
      return {
        ...mlResult,
        timestamp: new Date().toISOString(),
        method: 'ml_model'
      };
    }
  } catch (error) {
    console.warn('ML analysis failed, using rule-based fallback:', error.message);
  }
  
  // Fall back to rule-based analysis
  return analyzeCropImageRuleBased(imagePath);
}

/**
 * Rule-based analysis (fallback when ML model unavailable)
 */
async function analyzeCropImageRuleBased(imagePath) {
  try {
    // Read image metadata
    const metadata = await sharp(imagePath).metadata();
    const { width, height, channels } = metadata;

    // Analyze image pixels for health indicators
    const image = sharp(imagePath);
    const { data, info } = await image
      .resize(224, 224) // Standard size for analysis
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = data;
    const pixelCount = info.width * info.height;
    const actualChannels = info.channels || 3; // RGB or RGBA
    
    // Analyze color patterns for disease detection
    let yellowCount = 0;
    let brownCount = 0;
    let greenCount = 0;
    let darkSpotsCount = 0;
    let pestLikePatterns = 0;
    
    // Analyze every 10th pixel for performance
    const step = actualChannels * 10;
    for (let i = 0; i < pixels.length - actualChannels; i += step) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      // Detect yellowing (symptom of disease/deficiency)
      if (r > 200 && g > 180 && b < 150) {
        yellowCount++;
      }
      
      // Detect browning (symptom of disease/deficiency)
      if (r > 150 && g < 100 && b < 100) {
        brownCount++;
      }
      
      // Detect healthy green
      if (g > r && g > b && g > 100) {
        greenCount++;
      }
      
      // Detect dark spots (possible disease lesions)
      if (r < 80 && g < 80 && b < 80) {
        darkSpotsCount++;
      }
      
      // Detect pest-like patterns (irregular shapes, holes)
      if (r < 100 && g < 100 && b < 100 && (r !== g || g !== b)) {
        pestLikePatterns++;
      }
    }
    
    const yellowPercentage = (yellowCount / (pixelCount / 10)) * 100;
    const brownPercentage = (brownCount / (pixelCount / 10)) * 100;
    const greenPercentage = (greenCount / (pixelCount / 10)) * 100;
    const darkSpotsPercentage = (darkSpotsCount / (pixelCount / 10)) * 100;
    const pestPatternPercentage = (pestLikePatterns / (pixelCount / 10)) * 100;
    
    // Determine health status based on analysis
    let healthStatus = 'healthy';
    let confidence = 85;
    const issues = [];
    const recommendations = [];
    
    // Yellowing detection (disease/deficiency)
    if (yellowPercentage > 15) {
      healthStatus = 'moderate';
      confidence = 75;
      issues.push({
        type: 'yellowing',
        severity: yellowPercentage > 25 ? 'high' : 'moderate',
        description: `Leaf yellowing detected (${yellowPercentage.toFixed(1)}% of image). This may indicate nutrient deficiency, water stress, or early disease symptoms.`
      });
      recommendations.push('Check for nitrogen deficiency. Apply balanced fertilizer if needed.');
      recommendations.push('Monitor watering schedule. Yellowing can indicate over or under-watering.');
    }
    
    // Browning detection (disease/necrosis)
    if (brownPercentage > 10) {
      healthStatus = brownPercentage > 20 ? 'critical' : 'moderate';
      confidence = Math.min(confidence, 70);
      issues.push({
        type: 'browning',
        severity: brownPercentage > 20 ? 'high' : 'moderate',
        description: `Brown spots/necrosis detected (${brownPercentage.toFixed(1)}% of image). This indicates tissue death, possibly due to disease or severe stress.`
      });
      recommendations.push('Immediate action required: Apply fungicide if fungal disease is suspected.');
      recommendations.push('Remove affected leaves to prevent spread.');
    }
    
    // Dark spots detection (disease lesions)
    if (darkSpotsPercentage > 5) {
      healthStatus = darkSpotsPercentage > 10 ? 'critical' : 'moderate';
      confidence = Math.min(confidence, 65);
      issues.push({
        type: 'dark_spots',
        severity: darkSpotsPercentage > 10 ? 'high' : 'moderate',
        description: `Dark spots/lesions detected (${darkSpotsPercentage.toFixed(1)}% of image). Possible disease infection (bacterial or fungal).`
      });
      recommendations.push('Apply appropriate fungicide or bactericide based on disease type.');
      recommendations.push('Improve air circulation and reduce humidity if possible.');
    }
    
    // Pest pattern detection
    if (pestPatternPercentage > 8) {
      healthStatus = pestPatternPercentage > 15 ? 'critical' : 'moderate';
      confidence = Math.min(confidence, 70);
      issues.push({
        type: 'pest_damage',
        severity: pestPatternPercentage > 15 ? 'high' : 'moderate',
        description: `Pest damage patterns detected (${pestPatternPercentage.toFixed(1)}% of image). Holes, irregular shapes, or feeding damage visible.`
      });
      recommendations.push('Apply neem oil or appropriate pesticide to control pests.');
      recommendations.push('Remove visible pests manually if safe to do so.');
      recommendations.push('Monitor for pest eggs or larvae on underside of leaves.');
    }
    
    // Low green percentage (poor health)
    if (greenPercentage < 40) {
      healthStatus = greenPercentage < 25 ? 'critical' : 'moderate';
      confidence = Math.min(confidence, 60);
      issues.push({
        type: 'low_vigor',
        severity: 'moderate',
        description: `Low green pigment detected (${greenPercentage.toFixed(1)}% of image). Indicates reduced chlorophyll, possibly due to stress or nutrient deficiency.`
      });
      recommendations.push('Check soil nutrient levels and pH.');
      recommendations.push('Ensure adequate sunlight and proper watering.');
    }
    
    // Overall assessment
    if (issues.length === 0) {
      healthStatus = 'healthy';
      confidence = 90;
      issues.push({
        type: 'healthy',
        severity: 'none',
        description: 'Leaves appear healthy with good green coloration. No visible disease symptoms or pest damage detected.'
      });
      recommendations.push('Continue current care practices.');
      recommendations.push('Regular monitoring recommended to maintain crop health.');
    }
    
    return {
      healthStatus,
      confidence: Math.round(confidence),
      issues,
      recommendations,
      analysis: {
        yellowPercentage: yellowPercentage.toFixed(1),
        brownPercentage: brownPercentage.toFixed(1),
        greenPercentage: greenPercentage.toFixed(1),
        darkSpotsPercentage: darkSpotsPercentage.toFixed(1),
        pestPatternPercentage: pestPatternPercentage.toFixed(1)
      },
      timestamp: new Date().toISOString(),
      method: 'rule_based'
    };
  } catch (error) {
    console.error('Image analysis error:', error);
    throw new Error('Failed to analyze image: ' + error.message);
  }
}

module.exports = {
  analyzeCropImage
};

