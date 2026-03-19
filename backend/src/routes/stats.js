const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');

// GET /api/stats
router.get('/', async (req, res) => {
  try {
    const { count: totalLeads } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    const { count: activeLeads } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: totalAppointments } = await supabase.from('appointments').select('*', { count: 'exact', head: true });
    
    // Today's appointments (confirmed)
    const today = new Date().toISOString().split('T')[0];
    const { count: todayAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('scheduled_at', `${today}T00:00:00Z`)
      .lte('scheduled_at', `${today}T23:59:59Z`);

    const { count: totalProperties } = await supabase.from('properties').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: totalConversations } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('role', 'user');

    // Lead status breakdown
    const { data: leadsForBreakdown } = await supabase.from('leads').select('status');
    const statusCounts = leadsForBreakdown.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);

    // Last 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const { data: recentMessages } = await supabase
      .from('conversations')
      .select('created_at')
      .eq('role', 'user')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    const activityMap = recentMessages.reduce((acc, msg) => {
      const day = new Date(msg.created_at).toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
    const weeklyActivity = Object.entries(activityMap).map(([day, messages]) => ({ day, messages })).sort((a, b) => a.day.localeCompare(b.day));

    // Recent leads (last 5)
    const { data: recentLeads } = await supabase
      .from('leads')
      .select('phone, name, status, last_message_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Upcoming appointments (next 5)
    const { data: upcomingData } = await supabase
      .from('appointments')
      .select('*, leads(name)')
      .eq('status', 'confirmed')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5);
    
    const upcomingAppointments = (upcomingData || []).map(appt => ({
      ...appt,
      lead_display_name: appt.leads ? appt.leads.name : null
    }));

    // Property type breakdown
    const { data: propertiesForBreakdown } = await supabase.from('properties').select('property_type').eq('is_active', true);
    const propertyCounts = (propertiesForBreakdown || []).reduce((acc, p) => {
      const type = p.property_type || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    const propertyBreakdown = Object.entries(propertyCounts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);

    res.json({
      totalLeads: totalLeads || 0,
      activeLeads: activeLeads || 0,
      totalAppointments: totalAppointments || 0,
      todayAppointments: todayAppointments || 0,
      totalProperties: totalProperties || 0,
      totalConversations: totalConversations || 0,
      statusBreakdown,
      weeklyActivity,
      propertyBreakdown,
      recentLeads,
      upcomingAppointments,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

module.exports = router;
