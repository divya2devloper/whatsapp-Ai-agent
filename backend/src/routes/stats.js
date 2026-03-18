'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/stats
router.get('/', (req, res) => {
  const totalLeads = db.prepare('SELECT COUNT(*) AS n FROM leads').get().n;
  const activeLeads = db
    .prepare("SELECT COUNT(*) AS n FROM leads WHERE status = 'active'")
    .get().n;
  const totalAppointments = db
    .prepare('SELECT COUNT(*) AS n FROM appointments').get().n;
  const todayAppointments = db
    .prepare(
      "SELECT COUNT(*) AS n FROM appointments WHERE DATE(scheduled_at) = DATE('now', 'localtime') AND status = 'confirmed'"
    )
    .get().n;
  const totalProperties = db
    .prepare('SELECT COUNT(*) AS n FROM properties WHERE is_active = 1')
    .get().n;
  const totalConversations = db
    .prepare("SELECT COUNT(*) AS n FROM conversations WHERE role = 'user'")
    .get().n;

  // Lead status breakdown
  const statusBreakdown = db
    .prepare(
      `SELECT status, COUNT(*) AS count FROM leads GROUP BY status ORDER BY count DESC`
    )
    .all();

  // Last 7 days activity
  const weeklyActivity = db
    .prepare(
      `SELECT DATE(created_at, 'localtime') AS day, COUNT(*) AS messages
       FROM conversations
       WHERE role = 'user'
         AND created_at >= DATE('now', '-6 days', 'localtime')
       GROUP BY day
       ORDER BY day ASC`
    )
    .all();

  // Recent leads (last 5)
  const recentLeads = db
    .prepare(
      `SELECT phone, name, status, last_message_at, created_at
       FROM leads
       ORDER BY created_at DESC
       LIMIT 5`
    )
    .all();

  // Upcoming appointments (next 5)
  const upcomingAppointments = db
    .prepare(
      `SELECT a.*, l.name AS lead_display_name
       FROM appointments a
       LEFT JOIN leads l ON l.phone = a.lead_phone
       WHERE a.status = 'confirmed'
         AND a.scheduled_at >= DATETIME('now', 'localtime')
       ORDER BY a.scheduled_at ASC
       LIMIT 5`
    )
    .all();

  res.json({
    totalLeads,
    activeLeads,
    totalAppointments,
    todayAppointments,
    totalProperties,
    totalConversations,
    statusBreakdown,
    weeklyActivity,
    recentLeads,
    upcomingAppointments,
  });
});

module.exports = router;
