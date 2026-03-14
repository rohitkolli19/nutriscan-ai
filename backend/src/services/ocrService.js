const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * OCR using Google Cloud Vision API
 */
const runGoogleVisionOCR = async (base64Image) => {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    logger.warn('Google Cloud Vision API key not configured');
    return null;
  }

  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        requests: [{
          image: { content: base64Image },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 1 },
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
          ]
        }]
      },
      { timeout: 20000 }
    );

    const annotations = response.data.responses?.[0];
    const fullText = annotations?.fullTextAnnotation?.text ||
                     annotations?.textAnnotations?.[0]?.description;

    if (!fullText) return null;

    return {
      source: 'google_vision',
      text: fullText,
      confidence: 0.95
    };
  } catch (err) {
    logger.error('Google Vision OCR error:', err.message);
    return null;
  }
};

/**
 * OCR using Tesseract.js (fallback)
 */
const runTesseractOCR = async (imageBuffer) => {
  try {
    const Tesseract = require('tesseract.js');
    const { data: { text, confidence } } = await Tesseract.recognize(
      imageBuffer,
      'eng',
      { logger: () => {} }
    );

    return {
      source: 'tesseract',
      text: text.trim(),
      confidence: confidence / 100
    };
  } catch (err) {
    logger.error('Tesseract OCR error:', err.message);
    return null;
  }
};

/**
 * Run OCR with fallback strategy
 * Tries Google Vision first, falls back to Tesseract
 */
const extractTextFromImage = async (base64Image, imageBuffer = null) => {
  // Try Google Vision first (higher accuracy)
  let result = await runGoogleVisionOCR(base64Image);

  // Fallback to Tesseract if Google Vision fails or not configured
  if (!result && imageBuffer) {
    logger.info('Falling back to Tesseract OCR');
    result = await runTesseractOCR(imageBuffer);
  }

  // If we have Google AI key but no Vision key, use Gemini for OCR
  if (!result && process.env.GOOGLE_AI_API_KEY) {
    logger.info('Using Gemini for OCR fallback');
    try {
      const geminiResult = await runGeminiOCR(base64Image);
      result = geminiResult;
    } catch (err) {
      logger.error('Gemini OCR fallback error:', err.message);
    }
  }

  return result;
};

/**
 * Use Gemini as OCR fallback (when Google Vision not available)
 */
const runGeminiOCR = async (base64Image, mimeType = 'image/jpeg') => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [{
        parts: [
          {
            text: 'Extract ALL text from this image exactly as it appears. Include every word, number, and symbol. Output only the raw text, no commentary.'
          },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 2048 }
    },
    { timeout: 20000 }
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? { source: 'gemini_ocr', text, confidence: 0.85 } : null;
};

/**
 * Clean and parse OCR text to extract menu items
 */
const parseMenuText = (rawText) => {
  if (!rawText) return [];

  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 2);

  // Filter out common non-dish lines
  const excludePatterns = [
    /^(menu|appetizers|starters|mains|desserts|beverages|drinks|sides|soups|salads)$/i,
    /^\d+\.?\s*$/,
    /^(price|cost|amount|total|tax|gst|₹|\$|€|£)[\s\d]/i,
    /^(call|tel|phone|address|www|http)/i,
    /^\s*-+\s*$/
  ];

  const dishes = lines.filter(line => {
    return !excludePatterns.some(p => p.test(line)) && line.split(' ').length >= 2;
  });

  // Remove price suffixes
  return dishes.map(dish => dish.replace(/\s*[\$₹€£]\s*\d+[\d.,]*\s*$/, '').trim());
};

module.exports = { extractTextFromImage, parseMenuText, runGoogleVisionOCR, runTesseractOCR };
