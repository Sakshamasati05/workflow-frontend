-- SQLite Database Schema for Workorder Workflow

-- 1. Workorders Table: Holds the main workorder metadata and approval status
CREATE TABLE IF NOT EXISTS workorders (
  id TEXT PRIMARY KEY,                       -- Unique workorder ID (e.g. WO-1001)
  name TEXT NOT NULL,                        -- Title of the workorder
  description TEXT DEFAULT '',               -- Detailed description
  status TEXT DEFAULT 'Pending Approval',    -- Draft, Pending Approval, Approved, Rejected, Pending Execution, In Progress, Completed, Cancelled
  createdBy TEXT NOT NULL,                   -- User who created the workorder
  createdAt TEXT NOT NULL,                   -- Date of creation
  rejectionComment TEXT DEFAULT '',          -- Reason if rejected by reviewer
  cancellationComment TEXT DEFAULT ''        -- Reason if cancelled
);

-- 2. Groups Table: Groups tasks/items within a workorder for structural organization
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,                       -- Unique group ID (e.g. GRP-001)
  workorderId TEXT NOT NULL,                 -- Reference to parent workorder
  name TEXT NOT NULL,                        -- Name of the group (e.g. "Fire Safety")
  sortOrder INTEGER DEFAULT 0,               -- Display ordering index
  FOREIGN KEY (workorderId) REFERENCES workorders(id) ON DELETE CASCADE
);

-- 3. Items Table: Individual tasks or checklist questions in a group
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,                       -- Unique item ID (e.g. ITM-10001)
  groupId TEXT NOT NULL,                     -- Reference to parent group
  name TEXT NOT NULL,                        -- Task name / Question
  category TEXT DEFAULT '',                  -- Task category (e.g. "Mechanical")
  type TEXT DEFAULT 'Single Select',         -- Value type: Yes/No, Checkbox, Numeric, Single Select
  options TEXT DEFAULT '[]',                 -- JSON array of choices for selection types
  lowerLimit REAL,                           -- Minimum acceptable value (Numeric only)
  upperLimit REAL,                           -- Maximum acceptable value (Numeric only)
  executionStatus TEXT DEFAULT 'Pending',    -- Task execution state: Pending, Done, Undone, Cancelled
  value TEXT DEFAULT '',                     -- User entered value or response
  sortOrder INTEGER DEFAULT 0,               -- Display ordering index inside group
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
);

-- 4. Audit Trail Table: Records history of changes and approval actions
CREATE TABLE IF NOT EXISTS audit_trail (
  id TEXT PRIMARY KEY,                       -- Unique event ID
  workorderId TEXT NOT NULL,                 -- Reference to workorder
  timestamp TEXT NOT NULL,                   -- Date and time of action
  user TEXT NOT NULL,                        -- User who did the action
  action TEXT NOT NULL,                      -- Action description (e.g. "Approved Workorder")
  details TEXT DEFAULT '',                   -- Extra details or reasons
  sortOrder INTEGER DEFAULT 0,               -- Ordering index
  FOREIGN KEY (workorderId) REFERENCES workorders(id) ON DELETE CASCADE
);
