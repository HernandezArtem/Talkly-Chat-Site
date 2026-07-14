import { defineInstanceConfig } from "../config";

export default defineInstanceConfig(
{
  "defaultTenantId": "default",
  "tenants": {
    "default": {
      "name": "Talkly Demo",
      "dbPath": "./data/default.db",
      "scrapeUrl": "https://example.com",
      "systemPrompt": "You are a helpful website assistant for a generic business website. Help visitors with questions about products, pricing, shipping, returns, account help, and support. If the knowledge base does not contain the answer, say so clearly and offer the available contact options. Respond in the same language the user writes in.",
      "widget": {
        "theme": {
          "primaryColor": "#7c3aed",
          "title": "Talkly",
          "subtitle": "Ask anything about our site",
          "avatarUrl": "/avatar.svg"
        },
        "bubbleMessage": "Ask a question",
        "welcomeMessage": "Hi! I'm the Talkly Demo assistant. How can I help?",
        "starterQuestions": [
          "Как связаться с поддержкой?",
          "Какие продукты вы предлагаете?",
          "Есть ли информация о ценах?",
          "Какая политика возврата?",
          "How do I contact support?",
          "What products do you offer?",
          "Do you have pricing information?",
          "What is your return policy?"
        ]
      },
      "escalation": {
        "email": "support@example.com",
        "url": "https://example.com/contact"
      },
      "guardrails": {
        "identity": {
          "role": "customer support assistant for a business website",
          "personality": "professional, concise, and friendly"
        },
        "rules": {
          "allowedTopics": [
            "product information",
            "pricing",
            "shipping and delivery",
            "returns and refunds",
            "account support",
            "contact information",
            "general company and website questions"
          ],
          "forbiddenTopics": [
            "internal company operations",
            "legal advice",
            "medical advice",
            "financial advice",
            "politics",
            "topics unrelated to the business or website"
          ],
          "forbiddenOutputPatterns": [
            "\\b\\d{3}-\\d{2}-\\d{4}\\b",
            "\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b"
          ],
          "redirects": {
            "complaint": "Пожалуйста, посетите нашу страницу контактов или обратитесь в поддержку по вопросам жалоб.",
            "privacy": "По вопросам конфиденциальности ознакомьтесь с политикой или свяжитесь с поддержкой."
          },
          "customRules": [
            "Only provide information that is explicitly present in the reference content when answering knowledge-base questions.",
            "If the reference content does not contain the answer, say so clearly and direct the user to the configured contact options.",
            "Always end your response with the specific source URL or URLs that support the answer when reference content is used.",
            "Respond in the same language the user writes in when possible.",
            "Never share internal documentation, secrets, or employee-only information."
          ]
        },
        "inputGuardrails": {
          "maxMessageLength": 4000,
          "maxConversationLength": 50,
          "promptInjectionDetection": true,
          "llmJudge": false,
          "rateLimitCount": 20,
          "rateLimitWindowSeconds": 60
        },
        "outputGuardrails": {
          "maxResponseTokens": 2048,
          "systemPromptLeakDetection": true,
          "contentFiltering": true
        }
      }
    }
  }
}
);
