const express = require('express');
const { body, param, validationResult } = require('express-validator');
const multer = require('multer');
const xlsx = require('xlsx');
const router = express.Router();
const supabase = require('../db/supabaseClient');

const upload = multer({ storage: multer.memoryStorage() });

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// GET /api/properties
router.get('/', async (req, res) => {
  const { active } = req.query;
  let query = supabase.from('properties').select('*').order('location', { ascending: true });

  if (active === 'true') {
    query = query.eq('is_active', true);
  } else if (active === 'false') {
    query = query.eq('is_active', false);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/properties/import
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    const propertiesToInsert = [];
    for (const p of data) {
      // Map common header names
      const location = p.Location || p.location || p.PLACE || p.Place;
      const url = p.URL || p.url || p['Listing URL'] || p.Link || p.link;
      const description = p.Description || p.description || p.Desc || p.desc;
      const property_type = p['Property Type'] || p.property_type || p.Type || p.type;
      const price_range = p['Price Range'] || p.price_range || p.Price || p.price;
      const is_active_val = p.Active !== undefined ? (String(p.Active).toLowerCase() === 'true' || p.Active === 1) : true;

      // Multiple Image URLs (Image 1, Image 2, ..., Image 10) or a comma-separated "Images" column
      let images = [];
      if (p.Images || p.images) {
        images = String(p.Images || p.images).split(',').map(u => u.trim()).filter(Boolean);
      } else {
        for (let i = 1; i <= 10; i++) {
          const img = p[`Image ${i}`] || p[`image ${i}`] || p[`Image${i}`] || p[`image${i}`];
          if (img) images.push(String(img).trim());
        }
      }
      // Ensure max 10 images
      images = images.slice(0, 10);

      if (location && url) {
        propertiesToInsert.push({
          location,
          url,
          description: description || null,
          property_type: property_type || null,
          price_range: price_range || null,
          images: JSON.stringify(images),
          is_active: is_active_val,
        });
      }
    }

    if (propertiesToInsert.length > 0) {
      const { error } = await supabase.from('properties').insert(propertiesToInsert);
      if (error) throw error;
    }

    res.status(201).json({ success: true, count: propertiesToInsert.length });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse Excel file' });
  }
});

// POST /api/properties
router.post(
  '/',
  [
    body('location').trim().notEmpty().withMessage('location is required'),
    body('url').isURL().withMessage('url must be a valid URL'),
    body('description').optional().trim(),
    body('property_type').optional().trim(),
    body('price_range').optional().trim(),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    const { location, url, description, property_type, price_range, images } = req.body;

    const { data, error } = await supabase
      .from('properties')
      .insert([
        {
          location,
          url,
          description: description || null,
          property_type: property_type || null,
          price_range: price_range || null,
          images: Array.isArray(images) ? images.slice(0, 10) : [],
        },
      ])
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  }
);

// PUT /api/properties/:id
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('location').optional().trim().notEmpty(),
    body('url').optional().isURL(),
    body('description').optional().trim(),
    body('property_type').optional().trim(),
    body('price_range').optional().trim(),
    body('is_active').optional().isBoolean(),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    const id = req.params.id;

    const { location, url, description, property_type, price_range, is_active, images } = req.body;

    const updateData = {};
    if (location !== undefined) updateData.location = location;
    if (url !== undefined) updateData.url = url;
    if (description !== undefined) updateData.description = description;
    if (property_type !== undefined) updateData.property_type = property_type;
    if (price_range !== undefined) updateData.price_range = price_range;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (Array.isArray(images)) updateData.images = images.slice(0, 10);
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Property not found' });

    res.json(data[0]);
  }
);

// DELETE /api/properties/:id
router.delete('/:id', [param('id').isInt()], async (req, res) => {
  if (handleValidation(req, res)) return;
  const id = req.params.id;

  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

module.exports = router;
