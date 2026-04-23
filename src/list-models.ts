import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log('Fetching available models...');
    // Kita coba panggil listModels via fetch manual karena SDK terkadang tidak expose method ini dengan mudah
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    console.log('Available Models:');
    if (data.models) {
      data.models.forEach((m: any) => {
        console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.log('No models found or error in response:', data);
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }
}

listModels();
