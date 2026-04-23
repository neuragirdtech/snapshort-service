"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const dotenv = __importStar(require("dotenv"));
const path_1 = require("path");
dotenv.config({ path: (0, path_1.join)(__dirname, '../.env') });
async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Using API Key starts with:', apiKey?.substring(0, 5));
    if (!apiKey) {
        console.error('No API Key found in .env');
        return;
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    try {
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
                console.log(`✅ Model Found: ${m}`);
            }
            catch (e) {
                console.log(`❌ Model NOT Found: ${m}`);
            }
        }
    }
    catch (error) {
        console.error('Test Error:', error);
    }
}
checkModels();
//# sourceMappingURL=check_models.js.map