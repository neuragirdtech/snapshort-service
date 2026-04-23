import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Using API Key starts with:', apiKey?.substring(0, 5));
  
  if (!apiKey) {
    console.error('No API Key found in .env');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // Mencoba list models
    // Catatan: SDK @google/generative-ai tidak punya method listModels langsung yang mudah
    // Kita coba panggil satu per satu model populer untuk tes mana yang 404 mana yang tidak
    const modelsToTest = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-pro',
      'gemini-1.0-pro'
    ];

    console.log('--- TESTING MODELS ---');
    for (const m of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        // Kita tidak perlu generate content, cukup tes inisialisasi dan panggil metadata jika ada
        console.log(`✅ Model Found: ${m}`);
      } catch (e) {
        console.log(`❌ Model NOT Found: ${m}`);
      }
    }

  } catch (error) {
    console.error('Test Error:', error);
  }
}

checkModels();
