'use strict';

const express = require('express');
const multer = require('multer');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const { GoogleGenAI } = require('@google/genai');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const upload = multer({ dest: 'uploads/' });

// -- 1. SYSTEM PROMPT --
router.get('/prompt', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system_prompt')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Default if not found
    res.json({ prompt: data ? data.value : '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (typeof prompt !== 'string') return res.status(400).json({ error: 'Invalid prompt structure' });

    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'system_prompt', value: prompt, updated_at: new Date().toISOString() });

    if (error) throw error;
    res.json({ success: true, prompt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- 2. Q&A PAIRS --
router.get('/qa', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ai_training_qa')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/qa', async (req, res) => {
  try {
    const { question, answer, is_active } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Question and answer required' });

    const { data, error } = await supabase
      .from('ai_training_qa')
      .insert([{ question, answer, is_active: is_active !== false }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/qa/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('ai_training_qa').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- 3. KNOWLEDGE DOCUMENTS --
router.get('/documents', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/documents/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // 1. Save document record to DB
    const { data: docRecord, error: docError } = await supabase
      .from('knowledge_documents')
      .insert([{ filename: file.originalname, status: 'processing' }])
      .select()
      .single();

    if (docError) throw docError;
    // Send immediate response so frontend doesn't time out
    res.status(202).json({ success: true, document: docRecord, message: 'Processing started' });

    // 2. Process file in background
    (async () => {
      try {
        let textContent = '';
        if (file.mimetype === 'application/pdf') {
          const fileBuffer = fs.readFileSync(file.path);
          const pdfData = await pdfParse(fileBuffer);
          textContent = pdfData.text;
        } else {
          textContent = fs.readFileSync(file.path, 'utf8');
        }

        // 3. Chunk the text (simple sliding window or basic split)
        const chunks = textContent.match(/[^.!?]+[.!?]+/g) || [textContent];
        // Combine small chunks into roughly 1000 character pieces
        let finalChunks = [];
        let currentChunk = '';
        for (const sentence of chunks) {
          if ((currentChunk + sentence).length > 2000) {
            finalChunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += ' ' + sentence;
          }
        }
        if (currentChunk.trim().length > 0) finalChunks.push(currentChunk.trim());

        // 4. Generate Embeddings and Save
        for (const chunk of finalChunks) {
          if (chunk.length < 10) continue; // Skip tiny fragments
          const embedRes = await ai.models.embedContent({
             model: 'gemini-embedding-001',
             contents: chunk,
             config: { outputDimensionality: 768 }
          });
          const embedding = embedRes.embeddings[0].values;

          await supabase.from('knowledge_chunks').insert([{
            document_id: docRecord.id,
            content: chunk,
            embedding: `[${embedding.join(',')}]`
          }]);
        }

        // 5. Update document status
        await supabase.from('knowledge_documents').update({ status: 'completed' }).eq('id', docRecord.id);

      } catch (procErr) {
        console.error('File Processing Error:', procErr);
        await supabase.from('knowledge_documents').update({ status: 'failed' }).eq('id', docRecord.id);
      } finally {
        // Cleanup file
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    })();

  } catch (err) {
    console.error('Upload Error:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('knowledge_documents').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
