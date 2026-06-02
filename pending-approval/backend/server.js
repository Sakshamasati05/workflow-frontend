const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 5001;
const DB_PATH = path.join(__dirname, 'workorders.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Database Setup ───────────────────────────────────────────────────────────

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS workorders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'Pending Approval',
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    rejectionComment TEXT DEFAULT '',
    cancellationComment TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    workorderId TEXT NOT NULL,
    name TEXT NOT NULL,
    sortOrder INTEGER DEFAULT 0,
    FOREIGN KEY (workorderId) REFERENCES workorders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    groupId TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    type TEXT DEFAULT 'Single Select',
    lowerLimit REAL,
    upperLimit REAL,
    executionStatus TEXT DEFAULT 'Pending',
    value TEXT DEFAULT '',
    sortOrder INTEGER DEFAULT 0,
    FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS item_options (
    itemId TEXT NOT NULL,
    optionText TEXT NOT NULL,
    sortOrder INTEGER DEFAULT 0,
    FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_trail (
    id TEXT PRIMARY KEY,
    workorderId TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    user TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    sortOrder INTEGER DEFAULT 0,
    FOREIGN KEY (workorderId) REFERENCES workorders(id) ON DELETE CASCADE
  );
`);

// ─── Helper: Build full workorder JSON from relational data ───────────────────

function buildWorkorderJSON(wo) {
  const groups = db.prepare('SELECT * FROM groups WHERE workorderId = ? ORDER BY sortOrder').all(wo.id);
  const auditTrail = db.prepare('SELECT * FROM audit_trail WHERE workorderId = ? ORDER BY sortOrder').all(wo.id);

  return {
    id: wo.id,
    name: wo.name,
    description: wo.description,
    status: wo.status,
    createdBy: wo.createdBy,
    createdAt: wo.createdAt,
    groups: groups.map(g => {
      const items = db.prepare('SELECT * FROM items WHERE groupId = ? ORDER BY sortOrder').all(g.id);
      return {
        id: g.id,
        name: g.name,
        items: items.map(item => {
          const optionRows = db.prepare('SELECT optionText FROM item_options WHERE itemId = ? ORDER BY sortOrder').all(item.id);
          return {
            id: item.id,
            name: item.name,
            category: item.category,
            type: item.type,
            options: optionRows.map(o => o.optionText),
            lowerLimit: item.lowerLimit,
            upperLimit: item.upperLimit,
            executionStatus: item.executionStatus,
            value: item.type === 'Checkbox' ? (item.value === 'true') : item.value
          };
        })
      };
    }),
    rejectionComment: wo.rejectionComment,
    cancellationComment: wo.cancellationComment,
    auditTrail: auditTrail.map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      user: a.user,
      action: a.action,
      details: a.details
    }))
  };
}

// ─── Helper: Insert a full workorder object into the DB ───────────────────────

const insertWorkorder = db.transaction((wo) => {
  db.prepare(`
    INSERT OR REPLACE INTO workorders (id, name, description, status, createdBy, createdAt, rejectionComment, cancellationComment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(wo.id, wo.name, wo.description || '', wo.status, wo.createdBy, wo.createdAt, wo.rejectionComment || '', wo.cancellationComment || '');

  // Delete existing children to re-insert (for updates)
  db.prepare('DELETE FROM groups WHERE workorderId = ?').run(wo.id);
  db.prepare(`DELETE FROM audit_trail WHERE workorderId = ?`).run(wo.id);

  if (wo.groups && Array.isArray(wo.groups)) {
    wo.groups.forEach((group, gIdx) => {
      db.prepare('INSERT INTO groups (id, workorderId, name, sortOrder) VALUES (?, ?, ?, ?)').run(group.id, wo.id, group.name, gIdx);

      if (group.items && Array.isArray(group.items)) {
        group.items.forEach((item, iIdx) => {
          const valueStr = typeof item.value === 'boolean' ? String(item.value) : (item.value || '');
          db.prepare(`
            INSERT INTO items (id, groupId, name, category, type, lowerLimit, upperLimit, executionStatus, value, sortOrder)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(item.id, group.id, item.name, item.category || '', item.type || 'Single Select', item.lowerLimit ?? null, item.upperLimit ?? null, item.executionStatus || 'Pending', valueStr, iIdx);

          db.prepare('DELETE FROM item_options WHERE itemId = ?').run(item.id);
          if (item.options && Array.isArray(item.options)) {
            item.options.forEach((opt, oIdx) => {
              db.prepare('INSERT INTO item_options (itemId, optionText, sortOrder) VALUES (?, ?, ?)').run(item.id, opt, oIdx);
            });
          }
        });
      }
    });
  }

  if (wo.auditTrail && Array.isArray(wo.auditTrail)) {
    wo.auditTrail.forEach((audit, aIdx) => {
      db.prepare('INSERT INTO audit_trail (id, workorderId, timestamp, user, action, details, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)').run(audit.id, wo.id, audit.timestamp, audit.user, audit.action, audit.details || '', aIdx);
    });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET all workorders  (supports ?search=, ?status=, ?date=YYYY-MM-DD)
app.get('/api/workorders', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('/');
  }

  const { search, status, date } = req.query;

  // Build WHERE clause dynamically
  const conditions = [];
  const params     = [];

  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    conditions.push('(name LIKE ? OR id LIKE ? OR createdBy LIKE ? OR description LIKE ?)');
    params.push(like, like, like, like);
  }

  if (status && status !== 'All') {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const sql = `SELECT *, rowid FROM workorders ${whereClause} ORDER BY rowid DESC`;

  let rows = db.prepare(sql).all(...params);

  // Date filter: createdAt stored as "May 12, 2026" — compare after parsing
  if (date && date.trim()) {
    const [selYear, selMonth, selDay] = date.split('-').map(Number);
    rows = rows.filter(wo => {
      const d = new Date(wo.createdAt);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === selYear &&
             (d.getMonth() + 1) === selMonth &&
             d.getDate() === selDay;
    });
  }

  const workorders = rows.map(buildWorkorderJSON);
  res.json(workorders);
});

// GET single workorder
app.get('/api/workorders/:id', (req, res) => {
  const wo = db.prepare('SELECT * FROM workorders WHERE id = ?').get(req.params.id);
  if (wo) {
    res.json(buildWorkorderJSON(wo));
  } else {
    res.status(404).json({ message: 'Workorder not found' });
  }
});

// CREATE a new workorder
app.post('/api/workorders', (req, res) => {
  try {
    insertWorkorder(req.body);
    const wo = db.prepare('SELECT * FROM workorders WHERE id = ?').get(req.body.id);
    res.status(201).json(buildWorkorderJSON(wo));
  } catch (error) {
    console.error('Error creating workorder:', error);
    res.status(500).json({ message: 'Failed to create workorder', error: error.message });
  }
});

// UPDATE workorder (full replace)
app.put('/api/workorders/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM workorders WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Workorder not found' });
  }

  try {
    const updated = { ...req.body, id: req.params.id };
    insertWorkorder(updated);
    const wo = db.prepare('SELECT * FROM workorders WHERE id = ?').get(req.params.id);
    res.json(buildWorkorderJSON(wo));
  } catch (error) {
    console.error('Error updating workorder:', error);
    res.status(500).json({ message: 'Failed to update workorder', error: error.message });
  }
});

// PATCH workorder (partial update — status, comments, audit trail)
app.patch('/api/workorders/:id', (req, res) => {
  const { status, rejectionComment, cancellationComment, auditTrail } = req.body;
  const existing = db.prepare('SELECT * FROM workorders WHERE id = ?').get(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: 'Workorder not found' });
  }

  // Update scalar fields
  if (status !== undefined) {
    db.prepare('UPDATE workorders SET status = ? WHERE id = ?').run(status, req.params.id);
  }
  if (rejectionComment !== undefined) {
    db.prepare('UPDATE workorders SET rejectionComment = ? WHERE id = ?').run(rejectionComment, req.params.id);
  }
  if (cancellationComment !== undefined) {
    db.prepare('UPDATE workorders SET cancellationComment = ? WHERE id = ?').run(cancellationComment, req.params.id);
  }

  // Replace full audit trail if provided
  if (auditTrail && Array.isArray(auditTrail)) {
    db.prepare('DELETE FROM audit_trail WHERE workorderId = ?').run(req.params.id);
    auditTrail.forEach((audit, idx) => {
      db.prepare('INSERT INTO audit_trail (id, workorderId, timestamp, user, action, details, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)').run(audit.id, req.params.id, audit.timestamp, audit.user, audit.action, audit.details || '', idx);
    });
  } else if (req.body.auditEvent) {
    // Append a single audit event
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sortOrder), -1) as maxOrder FROM audit_trail WHERE workorderId = ?').get(req.params.id);
    db.prepare('INSERT INTO audit_trail (id, workorderId, timestamp, user, action, details, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      req.body.auditEvent.id, req.params.id, req.body.auditEvent.timestamp, req.body.auditEvent.user, req.body.auditEvent.action, req.body.auditEvent.details || '', (maxOrder.maxOrder + 1)
    );
  }

  const wo = db.prepare('SELECT * FROM workorders WHERE id = ?').get(req.params.id);
  res.json(buildWorkorderJSON(wo));
});

// DELETE workorder
app.delete('/api/workorders/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM workorders WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Workorder not found' });
  }

  db.prepare('DELETE FROM workorders WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: `Workorder ${req.params.id} deleted` });
});

// GET database stats and structure info
app.get('/api/db-info', (req, res) => {
  try {
    const fs = require('fs');
    let dbSize = 0;
    if (fs.existsSync(DB_PATH)) {
      dbSize = fs.statSync(DB_PATH).size;
    }
    
    const workordersCount = db.prepare('SELECT COUNT(*) as count FROM workorders').get().count;
    const pendingApprovalCount = db.prepare("SELECT COUNT(*) as count FROM workorders WHERE status = 'Pending Approval'").get().count;
    const groupsCount = db.prepare('SELECT COUNT(*) as count FROM groups').get().count;
    const itemsCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
    const journalMode = db.pragma('journal_mode')[0].journal_mode;
    
    res.json({
      dbSize,
      journalMode,
      counts: {
        workorders: workordersCount,
        pendingApproval: pendingApprovalCount,
        groups: groupsCount,
        items: itemsCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all records of a specific table
app.get('/api/db-table/:tableName', (req, res) => {
  const { tableName } = req.params;
  const allowedTables = ['workorders', 'groups', 'items', 'audit_trail', 'item_options'];
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }
  
  try {
    const rows = db.prepare(`SELECT * FROM \`${tableName}\``).all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST to execute custom SQL query
app.post('/api/db-query', (req, res) => {
  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }
  
  try {
    const stmt = db.prepare(sql);
    let result;
    
    if (stmt.reader) {
      result = stmt.all();
    } else {
      const info = stmt.run();
      result = {
        changes: info.changes,
        lastInsertRowid: info.lastInsertRowid.toString()
      };
    }
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});


// RESET data (seed with default workorders)
app.post('/api/reset', (req, res) => {
  const defaultData = [
    {
      "id": "WO-1001",
      "name": "Monthly Safety Inspection",
      "description": "Full facility safety walk-through",
      "status": "Pending Approval",
      "createdBy": "Saksham Asati",
      "createdAt": "May 12, 2026",
      "groups": [
        {
          "id": "GRP-001",
          "name": "Fire Safety",
          "items": [
            { "id": "ITM-10001", "name": "Check fire extinguishers", "category": "Safety", "type": "Single Select", "options": ["Pass", "Fail", "N/A"], "lowerLimit": null, "upperLimit": null, "executionStatus": "Pending", "value": "" },
            { "id": "ITM-10002", "name": "Test smoke detectors", "category": "Safety", "type": "Yes/No", "options": [], "lowerLimit": null, "upperLimit": null, "executionStatus": "Pending", "value": "" }
          ]
        },
        {
          "id": "GRP-002",
          "name": "Equipment Check",
          "items": [
            { "id": "ITM-10003", "name": "Boiler temperature reading", "category": "Mechanical", "type": "Numeric", "options": [], "lowerLimit": 60, "upperLimit": 90, "executionStatus": "Pending", "value": "" },
            { "id": "ITM-10004", "name": "Pressure gauge reading", "category": "Mechanical", "type": "Numeric", "options": [], "lowerLimit": 1, "upperLimit": 5, "executionStatus": "Pending", "value": "" },
            { "id": "ITM-10005", "name": "PPE available", "category": "Safety", "type": "Checkbox", "options": [], "lowerLimit": null, "upperLimit": null, "executionStatus": "Pending", "value": false }
          ]
        }
      ],
      "rejectionComment": "",
      "cancellationComment": "",
      "auditTrail": [
        { "id": "AUD-01", "timestamp": "May 12, 2026, 10:00 AM", "user": "Saksham Asati", "action": "Created Workorder 'Monthly Safety Inspection'", "details": "" },
        { "id": "AUD-02", "timestamp": "May 12, 2026, 10:05 AM", "user": "Saksham Asati", "action": "Added Group 'Fire Safety'", "details": "" },
        { "id": "AUD-03", "timestamp": "May 12, 2026, 10:10 AM", "user": "Saksham Asati", "action": "Added Group 'Equipment Check'", "details": "" },
        { "id": "AUD-04", "timestamp": "May 12, 2026, 10:15 AM", "user": "Saksham Asati", "action": "Submitted for Approval", "details": "" }
      ]
    },
    {
      "id": "WO-1002",
      "name": "Quarterly Maintenance Audit",
      "description": "Q2 maintenance audit for all machinery",
      "status": "Pending Approval",
      "createdBy": "Ravi Sharma",
      "createdAt": "May 13, 2026",
      "groups": [
        {
          "id": "GRP-003",
          "name": "Machinery Lubrication",
          "items": [
            { "id": "ITM-10006", "name": "Conveyor belt lubrication", "category": "Maintenance", "type": "Single Select", "options": ["Done", "Skipped", "Requires Attention"], "lowerLimit": null, "upperLimit": null, "executionStatus": "Pending", "value": "" },
            { "id": "ITM-10007", "name": "Gear oil level", "category": "Maintenance", "type": "Numeric", "options": [], "lowerLimit": 0, "upperLimit": 100, "executionStatus": "Pending", "value": "" }
          ]
        }
      ],
      "rejectionComment": "",
      "cancellationComment": "",
      "auditTrail": [
        { "id": "AUD-05", "timestamp": "May 13, 2026, 11:00 AM", "user": "Ravi Sharma", "action": "Created Workorder 'Quarterly Maintenance Audit'", "details": "" },
        { "id": "AUD-06", "timestamp": "May 13, 2026, 11:15 AM", "user": "Ravi Sharma", "action": "Added Group 'Machinery Lubrication'", "details": "" },
        { "id": "AUD-07", "timestamp": "May 13, 2026, 11:30 AM", "user": "Ravi Sharma", "action": "Submitted for Approval", "details": "" }
      ]
    },
    {
      "id": "WO-1003",
      "name": "Electrical Panel Inspection",
      "description": "Annual electrical safety review",
      "status": "Approved",
      "createdBy": "Meera Patel",
      "createdAt": "May 10, 2026",
      "groups": [
        {
          "id": "GRP-004",
          "name": "Panel Checks",
          "items": [
            { "id": "ITM-10008", "name": "Visual inspection of panel", "category": "Electrical", "type": "Yes/No", "options": [], "lowerLimit": null, "upperLimit": null, "executionStatus": "Pending", "value": "" }
          ]
        }
      ],
      "rejectionComment": "",
      "cancellationComment": "",
      "auditTrail": [
        { "id": "AUD-08", "timestamp": "May 10, 2026, 09:00 AM", "user": "Meera Patel", "action": "Created Workorder 'Electrical Panel Inspection'", "details": "" },
        { "id": "AUD-09", "timestamp": "May 10, 2026, 09:15 AM", "user": "Meera Patel", "action": "Submitted for Approval", "details": "" },
        { "id": "AUD-10", "timestamp": "May 11, 2026, 10:00 AM", "user": "Saksham Asati", "action": "Approved Workorder", "details": "" }
      ]
    },
    {
      "id": "WO-1004",
      "name": "HVAC Filter Replacement",
      "description": "Replace all HVAC filters on floor 2",
      "status": "Rejected",
      "createdBy": "Karan Mehta",
      "createdAt": "May 8, 2026",
      "groups": [
        {
          "id": "GRP-005",
          "name": "Filter Units",
          "items": [
            { "id": "ITM-10009", "name": "Unit A filter replaced", "category": "HVAC", "type": "Checkbox", "options": [], "lowerLimit": null, "upperLimit": null, "executionStatus": "Pending", "value": false }
          ]
        }
      ],
      "rejectionComment": "Missing part numbers for replacement filters. Please resubmit with correct references.",
      "cancellationComment": "",
      "auditTrail": [
        { "id": "AUD-11", "timestamp": "May 8, 2026, 08:30 AM", "user": "Karan Mehta", "action": "Created Workorder 'HVAC Filter Replacement'", "details": "" },
        { "id": "AUD-12", "timestamp": "May 8, 2026, 08:45 AM", "user": "Karan Mehta", "action": "Submitted for Approval", "details": "" },
        { "id": "AUD-13", "timestamp": "May 9, 2026, 11:20 AM", "user": "Saksham Asati", "action": "Rejected Workorder", "details": "Reason: Missing part numbers for replacement filters. Please resubmit with correct references." }
      ]
    }
  ];

  // Clear all tables and re-seed
  db.exec('DELETE FROM items; DELETE FROM groups; DELETE FROM audit_trail; DELETE FROM workorders;');
  defaultData.forEach(wo => insertWorkorder(wo));

  const all = db.prepare('SELECT *, rowid FROM workorders ORDER BY rowid DESC').all().map(buildWorkorderJSON);
  res.json({ message: 'Data reset successfully', data: all });
});

// ─── Seed DB if empty ─────────────────────────────────────────────────────────

const count = db.prepare('SELECT COUNT(*) as count FROM workorders').get();
if (count.count === 0) {
  console.log('Database is empty, seeding with default data...');
  // Trigger reset logic inline
  const defaultData = [
    {
      id: "WO-1001", name: "Monthly Safety Inspection", description: "Full facility safety walk-through",
      status: "Pending Approval", createdBy: "Saksham Asati", createdAt: "May 12, 2026",
      groups: [
        { id: "GRP-001", name: "Fire Safety", items: [
          { id: "ITM-10001", name: "Check fire extinguishers", category: "Safety", type: "Single Select", options: ["Pass", "Fail", "N/A"], lowerLimit: null, upperLimit: null, executionStatus: "Pending", value: "" },
          { id: "ITM-10002", name: "Test smoke detectors", category: "Safety", type: "Yes/No", options: [], lowerLimit: null, upperLimit: null, executionStatus: "Pending", value: "" }
        ]},
        { id: "GRP-002", name: "Equipment Check", items: [
          { id: "ITM-10003", name: "Boiler temperature reading", category: "Mechanical", type: "Numeric", options: [], lowerLimit: 60, upperLimit: 90, executionStatus: "Pending", value: "" },
          { id: "ITM-10004", name: "Pressure gauge reading", category: "Mechanical", type: "Numeric", options: [], lowerLimit: 1, upperLimit: 5, executionStatus: "Pending", value: "" },
          { id: "ITM-10005", name: "PPE available", category: "Safety", type: "Checkbox", options: [], lowerLimit: null, upperLimit: null, executionStatus: "Pending", value: false }
        ]}
      ],
      rejectionComment: "", cancellationComment: "",
      auditTrail: [
        { id: "AUD-01", timestamp: "May 12, 2026, 10:00 AM", user: "Saksham Asati", action: "Created Workorder 'Monthly Safety Inspection'", details: "" },
        { id: "AUD-02", timestamp: "May 12, 2026, 10:05 AM", user: "Saksham Asati", action: "Added Group 'Fire Safety'", details: "" },
        { id: "AUD-03", timestamp: "May 12, 2026, 10:10 AM", user: "Saksham Asati", action: "Added Group 'Equipment Check'", details: "" },
        { id: "AUD-04", timestamp: "May 12, 2026, 10:15 AM", user: "Saksham Asati", action: "Submitted for Approval", details: "" }
      ]
    },
    {
      id: "WO-1002", name: "Quarterly Maintenance Audit", description: "Q2 maintenance audit for all machinery",
      status: "Pending Approval", createdBy: "Ravi Sharma", createdAt: "May 13, 2026",
      groups: [
        { id: "GRP-003", name: "Machinery Lubrication", items: [
          { id: "ITM-10006", name: "Conveyor belt lubrication", category: "Maintenance", type: "Single Select", options: ["Done", "Skipped", "Requires Attention"], lowerLimit: null, upperLimit: null, executionStatus: "Pending", value: "" },
          { id: "ITM-10007", name: "Gear oil level", category: "Maintenance", type: "Numeric", options: [], lowerLimit: 0, upperLimit: 100, executionStatus: "Pending", value: "" }
        ]}
      ],
      rejectionComment: "", cancellationComment: "",
      auditTrail: [
        { id: "AUD-05", timestamp: "May 13, 2026, 11:00 AM", user: "Ravi Sharma", action: "Created Workorder 'Quarterly Maintenance Audit'", details: "" },
        { id: "AUD-06", timestamp: "May 13, 2026, 11:15 AM", user: "Ravi Sharma", action: "Added Group 'Machinery Lubrication'", details: "" },
        { id: "AUD-07", timestamp: "May 13, 2026, 11:30 AM", user: "Ravi Sharma", action: "Submitted for Approval", details: "" }
      ]
    },
    {
      id: "WO-1003", name: "Electrical Panel Inspection", description: "Annual electrical safety review",
      status: "Approved", createdBy: "Meera Patel", createdAt: "May 10, 2026",
      groups: [
        { id: "GRP-004", name: "Panel Checks", items: [
          { id: "ITM-10008", name: "Visual inspection of panel", category: "Electrical", type: "Yes/No", options: [], lowerLimit: null, upperLimit: null, executionStatus: "Pending", value: "" }
        ]}
      ],
      rejectionComment: "", cancellationComment: "",
      auditTrail: [
        { id: "AUD-08", timestamp: "May 10, 2026, 09:00 AM", user: "Meera Patel", action: "Created Workorder 'Electrical Panel Inspection'", details: "" },
        { id: "AUD-09", timestamp: "May 10, 2026, 09:15 AM", user: "Meera Patel", action: "Submitted for Approval", details: "" },
        { id: "AUD-10", timestamp: "May 11, 2026, 10:00 AM", user: "Saksham Asati", action: "Approved Workorder", details: "" }
      ]
    },
    {
      id: "WO-1004", name: "HVAC Filter Replacement", description: "Replace all HVAC filters on floor 2",
      status: "Rejected", createdBy: "Karan Mehta", createdAt: "May 8, 2026",
      groups: [
        { id: "GRP-005", name: "Filter Units", items: [
          { id: "ITM-10009", name: "Unit A filter replaced", category: "HVAC", type: "Checkbox", options: [], lowerLimit: null, upperLimit: null, executionStatus: "Pending", value: false }
        ]}
      ],
      rejectionComment: "Missing part numbers for replacement filters. Please resubmit with correct references.", cancellationComment: "",
      auditTrail: [
        { id: "AUD-11", timestamp: "May 8, 2026, 08:30 AM", user: "Karan Mehta", action: "Created Workorder 'HVAC Filter Replacement'", details: "" },
        { id: "AUD-12", timestamp: "May 8, 2026, 08:45 AM", user: "Karan Mehta", action: "Submitted for Approval", details: "" },
        { id: "AUD-13", timestamp: "May 9, 2026, 11:20 AM", user: "Saksham Asati", action: "Rejected Workorder", details: "Reason: Missing part numbers for replacement filters. Please resubmit with correct references." }
      ]
    }
  ];
  defaultData.forEach(wo => insertWorkorder(wo));
  console.log('Seeded 4 default workorders.');
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

// ─── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});
