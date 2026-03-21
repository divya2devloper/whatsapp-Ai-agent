const express = require('express');
const { param, body, validationResult } = require('express-validator');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// GET /api/leads/export
router.get('/export', async (req, res) => {
  try {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leads/import
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) return res.status(400).json({ error: 'Excel file is empty' });

    const leadsToInsert = data.map(l => ({
      phone: String(l.Phone || l.phone || l.Mobile || l.mobile || '').trim(),
      name: l.Name || l.name || null,
      email: l.Email || l.email || null,
      status: l.Status || l.status || 'new',
      notes: l.Notes || l.notes || null,
    })).filter(l => l.phone);

    if (leadsToInsert.length > 0) {
      const { error } = await supabase.from('leads').upsert(leadsToInsert, { onConflict: 'phone' });
      if (error) throw error;
    }

    res.status(201).json({ success: true, count: leadsToInsert.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leads
router.get('/', async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;
  const from = (parseInt(page) - 1) * parseInt(limit);
  const to = from + parseInt(limit) - 1;

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`phone.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: leads, count: total, error } = await query
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return res.status(500).json({ error: error.message });

  // Add counts (In a real app, you'd use a view or joined query if possible)
  const leadsWithCounts = await Promise.all(leads.map(async (l) => {
    const { count: message_count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('lead_phone', l.phone)
      .eq('role', 'user');

    const { count: appointment_count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('lead_phone', l.phone)
      .eq('status', 'confirmed');

    return { ...l, message_count: message_count || 0, appointment_count: appointment_count || 0 };
  }));

  res.json({ leads: leadsWithCounts, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/leads/:phone
router.get(
  '/:phone',
  [param('phone').trim().notEmpty()],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    const phone = req.params.phone;

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (leadError) return res.status(500).json({ error: leadError.message });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, role, content, created_at')
      .eq('lead_phone', phone)
      .order('id', { ascending: true });

    if (convError) return res.status(500).json({ error: convError.message });

    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('*')
      .eq('lead_phone', phone)
      .order('scheduled_at', { ascending: true });

    if (apptError) return res.status(500).json({ error: apptError.message });

    res.json({ lead, conversations, appointments });
  }
);

// PUT /api/leads/:phone
router.put(
  '/:phone',
  [
    param('phone').trim().notEmpty(),
    body('status')
      .optional()
      .isIn(['new', 'active', 'qualified', 'converted', 'closed']),
    body('name').optional().trim(),
    body('email').optional().isEmail(),
    body('notes').optional().trim(),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    const phone = req.params.phone;
    const { status, name, email, notes } = req.body;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('phone', phone)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Lead not found' });

    res.json(data[0]);
  }
);

// DELETE /api/leads/:phone
router.delete('/:phone', [param('phone').trim().notEmpty()], async (req, res) => {
  if (handleValidation(req, res)) return;
  const phone = req.params.phone;

  // In Supabase, if cascade delete is not set, we delete manually
  await supabase.from('conversations').delete().eq('lead_phone', phone);
  await supabase.from('appointments').delete().eq('lead_phone', phone);
  const { error } = await supabase.from('leads').delete().eq('phone', phone);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;

module.exports = router;
