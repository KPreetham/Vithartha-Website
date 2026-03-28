import express from "express";
import axios from "axios";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/ping", (req, res) => {
  res.json({ message: "AI Route is working" });
});

router.post("/chat", protect, async (req, res) => {
  console.log("AI Chat Request Received");
  try {
    const { messages } = req.body;
    let apiKey =
      process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("AI Config Error: OPENROUTER_API_KEY is missing");
      return res.status(500).json({
        error: "AI Config Error",
        message: "OPENROUTER_API_KEY is missing from environment variables.",
      });
    }

    // Sanitize the key
    apiKey = apiKey.trim();
    if (apiKey.startsWith("Bearer ")) {
      apiKey = apiKey.replace("Bearer ", "").trim();
    }

    // List of free models to try in order (Verified working slugs)
    const modelsToTry = [
      "openai/gpt-oss-120b:free", 
      "google/gemini-2.0-flash:free", 
      "openrouter/free", 
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "meta-llama/llama-3.1-8b-instruct:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ];

    let lastError = null;
    for (const model of modelsToTry) {
      try {
        console.log(`Calling OpenRouter API with model: ${model}...`);
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: model,
            messages: messages,
            route: "fallback", // Explicitly tell OpenRouter to use its own fallback if supported
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://vithartha.com",
              "X-Title": "Vithartha AI",
            },
            timeout: 8000, // Slightly faster timeout to failover quicker
          },
        );

        console.log(`OpenRouter API Response Received (Model: ${model})`);
        return res.json(response.data);
      } catch (error) {
        lastError = error;
        const statusCode = error.response?.status;
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.warn(`Model ${model} failed [${statusCode}]: ${errorMsg}`);

        // If it's an auth error, don't bother trying other models
        if (statusCode === 401) break;
      }
    }

    // If we reach here, all models failed
    const statusCode = lastError.response?.status || 500;
    const errorData = lastError.response?.data;

    console.error(
      `AI Proxy Final Error [${statusCode}]:`,
      errorData || lastError.message,
    );

    res.status(statusCode).json({
      error: "AI Assistant Busy",
      message:
        "Our AI is momentarily busy. Please try sending your message again in a few seconds.",
      debug: errorData || lastError.message,
    });
  } catch (globalError) {
    console.error("Unexpected AI Route Error:", globalError);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred in the AI route.",
    });
  }
});

export default router;
