require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

app.post('/api/threat-model', async (req, res) => {

  const { architecture } = req.body;

  if (!architecture || !architecture.trim()) {
    return res.status(400).json({
      error: 'Architecture description required'
    });
  }

  try {

    const prompt = `
You are a cybersecurity threat modeling expert.

Analyze this architecture:

${architecture}

Generate STRIDE threats.

Return ONLY valid JSON:

{
  "threats": [
    {
      "type": "Spoofing",
      "title": "Threat title",
      "description": "What could go wrong",
      "mitigation": "How to prevent it"
    }
  ],
  "overallRisk": "High",
  "summary": "Short summary"
}

Generate at least 6 threats covering STRIDE categories.
`;

    console.log('Calling GPT-OSS 20B...');

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: 'You are a cybersecurity expert. Return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_object'
      },
      temperature: 0.2,
      max_completion_tokens: 2000,
      include_reasoning: false
    });

    const text = completion.choices[0].message.content;

    const result = JSON.parse(text);

    console.log('Threat model generated successfully');

    res.json(result);

  } catch (error) {

    console.error('GROQ ERROR:', error);

    res.status(500).json({
      error: 'Failed to generate threat model',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`🤖 Model: openai/gpt-oss-20b`);
});