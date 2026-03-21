const express = require('express');
const { body, param, validationResult } = require('express-validator');
const multer = require('multer');
const xlsx = require('xlsx');
const router = express.Router();
const supabase = require('../db/supabaseClient');

const upload = multer({ storage: multer.memoryStorage() });
const propertyUpload = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]);

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

// GET /api/properties/export
router.get('/export', async (req, res) => {
  try {
    const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Properties');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=properties.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
      const location = p.Location || p.location || p.PLACE || p.Place;
      const url = p.URL || p.url || p['Listing URL'] || p.Link || p.link;
      const description = p.Description || p.description || p.Desc || p.desc;
      const property_type = p['Property Type'] || p.property_type || p.Type || p.type;
      const price_range = p['Price Range'] || p.price_range || p.Price || p.price;
      const owner_name = p['Owner Name'] || p.owner_name || p.Owner || p.owner;
      const owner_number = p['Owner Number'] || p.owner_number || p.Phone || p.phone;
      const listing_status = p['Listing Status'] || p.listing_status || p.Status || p.status || 'Active';
      const is_active_val = p.Active !== undefined ? (String(p.Active).toLowerCase() === 'true' || p.Active === 1) : true;

      let images = [];
      if (p.Images || p.images) {
        images = String(p.Images || p.images).split(',').map(u => u.trim()).filter(Boolean);
      } else {
        for (let i = 1; i <= 10; i++) {
          const img = p[`Image ${i}`] || p[`image ${i}`] || p[`Image${i}`] || p[`image${i}`];
          if (img) images.push(String(img).trim());
        }
      }
      images = images.slice(0, 10);

      if (location) {
        propertiesToInsert.push({
          location,
          url: url || null,
          description: description || null,
          property_type: property_type || null,
          price_range: price_range || null,
          owner_name: owner_name || null,
          owner_number: owner_number || null,
          listing_status: listing_status || 'Active',
          images: JSON.stringify(images),
          is_active: is_active_val,
          video_url: p.video_url || p['Video URL'] || null
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
  propertyUpload,
  [
    body('location').trim().notEmpty().withMessage('location is required'),
    body('url').optional().custom((val) => {
      if (!val) return true;
      try { new URL(val); return true; } catch { throw new Error('url must be a valid URL'); }
    }),
    body('description').optional().trim(),
    body('property_type').optional().trim(),
    body('price_range').optional().trim(),
    body('owner_name').optional().trim(),
    body('owner_number').optional().trim(),
    body('listing_status').optional().isIn(['Active', 'Inactive', 'Sold']),
    body('video_url').optional().trim(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const { location, url, description, property_type, price_range, owner_name, owner_number, listing_status } = req.body;
      let images = [];
      let video_url = req.body.video_url || null;
      
      if (req.files) {
        if (req.files.images && req.files.images.length > 0) {
          for (const file of req.files.images) {
            const fileName = `images/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { data, error: uploadErr } = await supabase.storage
              .from('images')
              .upload(fileName, file.buffer, { contentType: file.mimetype });
            if (uploadErr) console.warn('Supabase Image Upload Error:', uploadErr.message);
            if (data) {
              const { data: publicData } = supabase.storage.from('images').getPublicUrl(fileName);
              images.push(publicData.publicUrl);
            }
          }
        }
        if (req.files.video && req.files.video.length > 0) {
          const file = req.files.video[0];
          const fileName = `videos/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { data, error: uploadErr } = await supabase.storage
            .from('images') // Use same bucket
            .upload(fileName, file.buffer, { contentType: file.mimetype });
          if (uploadErr) console.warn('Supabase Video Upload Error:', uploadErr.message);
          if (data) {
            const { data: publicData } = supabase.storage.from('images').getPublicUrl(fileName);
            video_url = publicData.publicUrl;
          }
        }
      }

      try {
        if (images.length === 0 && req.body.existing_images) {
          images = Array.isArray(req.body.existing_images) ? req.body.existing_images : JSON.parse(req.body.existing_images || '[]');
        }
      } catch (parseErr) {
        console.warn('JSON Parse Error for existing_images:', parseErr.message);
      }

      const { data, error } = await supabase
        .from('properties')
        .insert([
          {
            location,
            url: url || '',
            description: description || null,
            property_type: property_type || null,
            price_range: price_range || null,
            owner_name: owner_name || null,
            owner_number: owner_number || null,
            listing_status: listing_status || 'Active',
            images: images.slice(0, 10),
            video_url,
          },
        ])
        .select();

      if (error) return res.status(500).json({ error: error.message });
      res.status(201).json(data[0]);
    } catch (err) {
      console.error('Crash caught in POST /properties:', err);
      res.status(500).json({ error: 'Internal server error while saving property' });
    }
  }
);

// PUT /api/properties/:id
router.put(
  '/:id',
  propertyUpload,
  [
    param('id').isInt(),
    body('location').optional().trim().notEmpty(),
    body('url').optional().custom((val) => {
      if (!val) return true;
      try { new URL(val); return true; } catch { throw new Error('url must be a valid URL'); }
    }),
    body('description').optional().trim(),
    body('property_type').optional().trim(),
    body('price_range').optional().trim(),
    body('is_active').optional().isBoolean(),
    body('owner_name').optional().trim(),
    body('owner_number').optional().trim(),
    body('listing_status').optional().isIn(['Active', 'Inactive', 'Sold']),
    body('video_url').optional().trim(),
  ],
  async (req, res) => {
    try {
      if (handleValidation(req, res)) return;
      const id = req.params.id;

      const { location, url, description, property_type, price_range, is_active, owner_name, owner_number, listing_status, video_url: bodyVideoUrl } = req.body;
      
      let images = undefined;
      try {
        images = req.body.existing_images ? (Array.isArray(req.body.existing_images) ? req.body.existing_images : JSON.parse(req.body.existing_images)) : undefined;
      } catch(e) {
        console.warn('JSON Parse Error for existing_images:', e.message);
      }
      
      let video_url = bodyVideoUrl;

      if (req.files) {
        if (req.files.images && req.files.images.length > 0) {
          if (!images) images = [];
          for (const file of req.files.images) {
            const fileName = `images/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { data, error: uploadErr } = await supabase.storage
              .from('images')
              .upload(fileName, file.buffer, { contentType: file.mimetype });
            if (uploadErr) console.warn('Supabase Image Upload Error:', uploadErr.message);
            if (data) {
              const { data: publicData } = supabase.storage.from('images').getPublicUrl(fileName);
              images.push(publicData.publicUrl);
            }
          }
        }
        if (req.files.video && req.files.video.length > 0) {
          const file = req.files.video[0];
          const fileName = `videos/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { data, error: uploadErr } = await supabase.storage
            .from('images')
            .upload(fileName, file.buffer, { contentType: file.mimetype });
          if (uploadErr) console.warn('Supabase Video Upload Error:', uploadErr.message);
          if (data) {
            const { data: publicData } = supabase.storage.from('images').getPublicUrl(fileName);
            video_url = publicData.publicUrl;
          }
        }
      }

      const updateData = {};
      if (location !== undefined) updateData.location = location;
      if (url !== undefined) updateData.url = url || '';
      if (description !== undefined) updateData.description = description;
      if (property_type !== undefined) updateData.property_type = property_type;
      if (price_range !== undefined) updateData.price_range = price_range;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (owner_name !== undefined) updateData.owner_name = owner_name;
      if (owner_number !== undefined) updateData.owner_number = owner_number;
      if (listing_status !== undefined) updateData.listing_status = listing_status;
      if (Array.isArray(images)) updateData.images = images.slice(0, 10);
      if (video_url !== undefined) updateData.video_url = video_url;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) return res.status(500).json({ error: error.message });
      if (!data || data.length === 0) return res.status(404).json({ error: 'Property not found' });

      res.json(data[0]);
    } catch (err) {
      console.error('Crash caught in PUT /properties:', err);
      res.status(500).json({ error: 'Internal server error while saving property' });
    }
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
