import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const modelName = 'gemini-2.5-flash-lite';
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

// 1 pixel base64 dummy audio (or just dummy data)
const dummyBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="; // tiny wav file

async function testMimeType(mimeType) {
  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inlineData: { mimeType, data: dummyBase64 } }, { text: "hello" }] }]
    })
  });
  if (!res.ok) {
    console.log(`${mimeType} FAILED:`, await res.text());
  } else {
    console.log(`${mimeType} SUCCESS`);
  }
}

async function run() {
  await testMimeType('audio/webm');
  await testMimeType('audio/mp4');
  await testMimeType('audio/aac');
  await testMimeType('audio/wav');
}

run();
