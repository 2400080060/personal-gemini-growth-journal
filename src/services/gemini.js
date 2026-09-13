const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const secretClient = new SecretManagerServiceClient();
let apiKeyPromise;

async function getApiKey() {
  if (!apiKeyPromise) {
    apiKeyPromise = (async () => {
      const name =
        process.env.GROQ_SECRET_NAME ||
        'projects/302524930437/secrets/groq-api-key/versions/latest';

      const [version] = await secretClient.accessSecretVersion({ name });
      const key = version.payload?.data?.toString('utf8')?.trim();

      if (!key) throw new Error('Groq API key secret is empty');

      return key;
    })().catch(error => {
      apiKeyPromise = undefined;
      throw error;
    });
  }

  return apiKeyPromise;
}

async function generateText(prompt, config = {}) {
  const apiKey = await getApiKey();

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: config.temperature ?? 0.6,
      max_tokens: config.maxOutputTokens ?? 1200
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Groq API request failed:', data.error?.message || response.statusText);
    throw new Error('AI service request failed');
  }

  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function generateJSON(prompt) {
  const text = await generateText(
    `${prompt}\n\nReturn ONLY valid JSON. No markdown fences.`
  );

  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

    if (!match) {
      throw new Error('AI returned invalid JSON');
    }

    return JSON.parse(match[0]);
  }
}

async function analyzeJournal(text) {
  return generateJSON(`You are the reflection intelligence layer of a private personal growth journal. Analyze only the supplied entry; do not diagnose medical or mental-health conditions. Return exactly {"summary":string,"mood":"positive|neutral|mixed|difficult","themes":string[],"wins":string[],"challenges":string[],"action":string,"tags":string[]}. Keep it specific, supportive and concise. Journal:\n${text}`);
}

async function generateInsights(journals) {
  return generateJSON(`You are a personal growth analyst. Find repeated patterns supported by journal evidence. Do not diagnose or claim certainty. Return exactly {"headline":string,"patterns":[{"pattern":string,"evidence":string,"suggestion":string}],"momentum":string,"focus":string}. Max 3 patterns. History:\n${journals.map((j, i) => `ENTRY ${i + 1} (${j.createdAt}): ${j.text}`).join('\n\n')}`);
}

async function compareGoalProgress(goal, journals) {
  return generateJSON(`Compare the stated goal with evidence in the journal history. Never invent activity. Return exactly {"status":"on-track|mixed|needs-attention|insufficient-evidence","score":number,"evidence":string[],"gap":string,"nextStep":string}. Score 0-100 based on evidence. Goal: ${goal.title}\nDetails: ${goal.description || ''}\nHistory:\n${journals.map((j, i) => `ENTRY ${i + 1} (${j.createdAt}): ${j.text}`).join('\n\n')}`);
}

async function createGrowthPlan(goals, insights, journals) {
  return generateJSON(`Create a practical 30-day growth plan from these goals, insights and journal evidence. No medical advice and no generic filler. Return exactly {"title":string,"why":string,"weeks":[{"week":1,"focus":string,"actions":string[]},{"week":2,"focus":string,"actions":string[]},{"week":3,"focus":string,"actions":string[]},{"week":4,"focus":string,"actions":string[]}],"dailyCheckIn":string,"successSignal":string}. Each week has 3 small actions. Goals:${JSON.stringify(goals)}\nInsights:${JSON.stringify(insights)}\nRecent journals:${journals.slice(0, 10).map(j => j.text).join(' | ')}`);
}

async function chatWithContext(message, history, journals, goals) {
  return generateText(`You are the user's Personal Growth Assistant inside a private journal.

Your primary job is to answer the user's current question directly, clearly, and helpfully.

Use your general knowledge to answer factual, educational, technical, career, programming, or other general questions when appropriate.

Use the user's journals and goals as private context to personalize the response when relevant. Do NOT force unrelated questions to connect to their goals.

When useful, connect your answer to the user's goals or previous journal evidence, but only when there is a genuine connection.

Never claim that information came from the user's journal unless it actually appears in the supplied journal context.

If the user asks about their own progress, habits, patterns, goals, or history, prioritize the supplied journal and goal evidence. Never invent evidence.

For general questions, answer normally first, then optionally provide a short personalized connection.

Be concise but useful. Prefer practical examples and actionable advice when appropriate.

Do not diagnose medical or mental-health conditions and do not make guaranteed predictions.

JOURNALS:
${journals.slice(0, 8).map(j => `- ${j.createdAt}: ${j.text}`).join('\n') || 'None'}

GOALS:
${goals.map(g => `- ${g.title}: ${g.description || ''}`).join('\n') || 'None'}

CONVERSATION:
${history.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n') || 'None'}

USER:
${message}`);
}

module.exports = {
  analyzeJournal,
  generateInsights,
  compareGoalProgress,
  createGrowthPlan,
  chatWithContext
};
