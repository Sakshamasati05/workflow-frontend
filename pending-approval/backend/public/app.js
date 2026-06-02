document.addEventListener('DOMContentLoaded', () => {
  // --- App State ---
  let currentTable = 'workorders';
  let tableData = [];
  let sortColumn = null;
  let sortDirection = 'asc'; // 'asc' or 'desc'

  // --- DOM Elements ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const searchInput = document.getElementById('table-search');
  const mainTableHead = document.querySelector('#main-data-table thead');
  const mainTableBody = document.querySelector('#main-data-table tbody');
  
  const loaderOverlay = document.getElementById('table-loading');
  const emptyOverlay = document.getElementById('table-empty');
  const rowsCounter = document.getElementById('rows-counter');
  const schemaHint = document.getElementById('schema-hint');
  
  // Stats
  const statWorkorders = document.getElementById('stat-workorders');
  const statPending = document.getElementById('stat-pending');
  const statItems = document.getElementById('stat-items');
  const statDbInfo = document.getElementById('stat-db-info');
  
  // Action Buttons
  const btnRefresh = document.getElementById('btn-refresh');
  const btnResetDb = document.getElementById('btn-reset-db');
  
  // SQL Console
  const sqlInput = document.getElementById('sql-input');
  const btnRunQuery = document.getElementById('btn-run-query');
  const outputMeta = document.getElementById('output-meta');
  const outputError = document.getElementById('output-error');
  const errorMessage = document.getElementById('error-message');
  const outputTableHead = document.querySelector('#output-data-table thead');
  const outputTableBody = document.querySelector('#output-data-table tbody');
  const outputPlaceholder = document.getElementById('output-placeholder');
  const outputTableWrapper = document.getElementById('output-table-wrapper');
  const templateChips = document.querySelectorAll('.template-chip');
  
  // Modals
  const modalConfirm = document.getElementById('modal-confirm');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalConfirm = document.getElementById('btn-modal-confirm');

  // --- Formatting Helpers ---
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getStatusBadge(status) {
    if (!status) return '';
    const cleanStatus = String(status).trim();
    let badgeClass = 'badge-draft';
    
    if (cleanStatus === 'Pending Approval' || cleanStatus === 'Pending Execution' || cleanStatus === 'In Progress') {
      badgeClass = 'badge-pending';
    } else if (cleanStatus === 'Approved') {
      badgeClass = 'badge-approved';
    } else if (cleanStatus === 'Rejected') {
      badgeClass = 'badge-rejected';
    } else if (cleanStatus === 'Cancelled') {
      badgeClass = 'badge-cancelled';
    } else if (cleanStatus === 'Completed') {
      badgeClass = 'badge-completed';
    }
    
    return `<span class="badge ${badgeClass}">${cleanStatus}</span>`;
  }

  function formatCellValue(key, value) {
    if (value === null || value === undefined) return '<span style="color: var(--text-dark); font-style: italic;">null</span>';
    if (key.toLowerCase().includes('status')) return getStatusBadge(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return `<span style="font-family: var(--font-mono); font-size: 11px;">${JSON.stringify(value)}</span>`;
    return String(value);
  }

  // --- Fetch API helper ---
  async function apiFetch(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error(`API Fetch Error (${url}):`, e);
      throw e;
    }
  }

  // --- Load Metadata and Stats ---
  async function updateStats() {
    try {
      const stats = await apiFetch('/api/db-info');
      statWorkorders.innerText = stats.counts.workorders;
      statPending.innerText = stats.counts.pendingApproval;
      statItems.innerText = stats.counts.items;
      statDbInfo.innerHTML = `SQLite (${stats.journalMode})<br><span style="font-size: 10px; font-weight: normal; color: var(--text-dark);">${formatBytes(stats.dbSize)}</span>`;
      
      // Update sidebar badges
      document.getElementById('badge-workorders').innerText = stats.counts.workorders;
      document.getElementById('badge-groups').innerText = stats.counts.groups;
      document.getElementById('badge-items').innerText = stats.counts.items;
      
      // Fetch audits count for badge
      const audits = await apiFetch('/api/db-table/audit_trail');
      document.getElementById('badge-audit_trail').innerText = audits.length;
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // --- Load and Render Table ---
  async function loadTable(tableName) {
    currentTable = tableName;
    schemaHint.innerText = `Table: ${tableName}`;
    
    // Show spinner
    loaderOverlay.classList.remove('hidden');
    emptyOverlay.classList.add('hidden');
    mainTableHead.innerHTML = '';
    mainTableBody.innerHTML = '';
    
    try {
      tableData = await apiFetch(`/api/db-table/${tableName}`);
      
      // Reset sorting state
      sortColumn = null;
      sortDirection = 'asc';
      
      renderTable(tableData);
    } catch (err) {
      mainTableBody.innerHTML = `<tr><td colspan="100" style="text-align: center; color: var(--danger); padding: 30px;">Failed to load table "${tableName}": ${err.message}</td></tr>`;
    } finally {
      loaderOverlay.classList.add('hidden');
    }
  }

  function renderTable(data) {
    mainTableHead.innerHTML = '';
    mainTableBody.innerHTML = '';
    
    if (data.length === 0) {
      emptyOverlay.classList.remove('hidden');
      rowsCounter.innerText = 'Showing 0 rows';
      return;
    }
    
    emptyOverlay.classList.add('hidden');
    
    // Extract headers
    const headers = Object.keys(data[0]);
    
    // Create header row
    const trHead = document.createElement('tr');
    headers.forEach(header => {
      const th = document.createElement('th');
      th.className = 'sortable';
      
      let sortIndicator = '';
      if (sortColumn === header) {
        sortIndicator = sortDirection === 'asc' ? ' ▴' : ' ▾';
        th.style.color = 'var(--primary-hover)';
      }
      
      th.innerText = header + sortIndicator;
      th.addEventListener('click', () => handleSort(header));
      trHead.appendChild(th);
    });
    mainTableHead.appendChild(trHead);
    
    // Create body rows
    data.forEach(row => {
      const tr = document.createElement('tr');
      headers.forEach(header => {
        const td = document.createElement('td');
        td.innerHTML = formatCellValue(header, row[header]);
        td.title = String(row[header] || '');
        tr.appendChild(td);
      });
      mainTableBody.appendChild(tr);
    });
    
    rowsCounter.innerText = `Showing ${data.length} row${data.length === 1 ? '' : 's'}`;
  }

  // --- Sort Logic ---
  function handleSort(column) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
    
    const sorted = [...tableData].sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      
      if (valA === null || valA === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (valB === null || valB === undefined) return sortDirection === 'asc' ? 1 : -1;
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    renderTable(sorted);
  }

  // --- Client Side Filtering ---
  function filterTable() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      renderTable(tableData);
      return;
    }
    
    const filtered = tableData.filter(row => {
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
    
    renderTable(filtered);
  }

  // --- Execute Query Logic ---
  async function executeSQL() {
    const sql = sqlInput.value.trim();
    if (!sql) return;
    
    btnRunQuery.disabled = true;
    outputError.classList.add('hidden');
    outputPlaceholder.classList.add('hidden');
    outputTableWrapper.classList.add('hidden');
    outputMeta.innerText = 'Executing query...';
    
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/db-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      const resData = await response.json();
      const duration = (performance.now() - startTime).toFixed(1);
      
      if (!resData.success) {
        throw new Error(resData.error || 'Unknown query error');
      }
      
      const result = resData.result;
      
      // Update metadata message
      if (Array.isArray(result)) {
        outputMeta.innerText = `${result.length} row${result.length === 1 ? '' : 's'} returned in ${duration}ms`;
        renderQueryResult(result);
      } else {
        outputMeta.innerText = `Query OK, ${result.changes} rows affected (${duration}ms)`;
        outputTableHead.innerHTML = '';
        outputTableBody.innerHTML = `<tr><td style="color: var(--success); font-weight: 600; padding: 20px;">Query completed successfully.<br>Affected Rows: ${result.changes}<br>Last Insert ID: ${result.lastInsertRowid === '0' ? 'N/A' : result.lastInsertRowid}</td></tr>`;
        outputTableWrapper.classList.remove('hidden');
      }
      
      // Refresh database stats and grid in case data was modified
      updateStats();
      loadTable(currentTable);
      
    } catch (err) {
      outputMeta.innerText = 'Error occurred';
      errorMessage.innerText = err.message;
      outputError.classList.remove('hidden');
    } finally {
      btnRunQuery.disabled = false;
    }
  }

  function renderQueryResult(rows) {
    outputTableHead.innerHTML = '';
    outputTableBody.innerHTML = '';
    
    if (rows.length === 0) {
      outputTableBody.innerHTML = `<tr><td style="color: var(--text-dark); text-align: center; padding: 30px;">Empty set (0 rows returned)</td></tr>`;
      outputTableWrapper.classList.remove('hidden');
      return;
    }
    
    const headers = Object.keys(rows[0]);
    const trHead = document.createElement('tr');
    headers.forEach(header => {
      const th = document.createElement('th');
      th.innerText = header;
      trHead.appendChild(th);
    });
    outputTableHead.appendChild(trHead);
    
    rows.forEach(row => {
      const tr = document.createElement('tr');
      headers.forEach(header => {
        const td = document.createElement('td');
        td.innerHTML = formatCellValue(header, row[header]);
        td.title = String(row[header] || '');
        tr.appendChild(td);
      });
      outputTableBody.appendChild(tr);
    });
    
    outputTableWrapper.classList.remove('hidden');
  }

  // --- Reset Database Action ---
  async function resetDatabase() {
    btnModalConfirm.disabled = true;
    btnModalConfirm.innerText = 'Resetting...';
    
    try {
      await apiFetch('/api/reset', { method: 'POST' });
      modalConfirm.classList.add('hidden');
      
      // Refresh UI
      await updateStats();
      await loadTable(currentTable);
    } catch (err) {
      alert('Failed to reset database: ' + err.message);
    } finally {
      btnModalConfirm.disabled = false;
      btnModalConfirm.innerText = 'Reset Database';
    }
  }

  // --- Event Listeners ---
  
  // Tabs click
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      searchInput.value = '';
      loadTable(btn.getAttribute('data-table'));
    });
  });

  // Search input typing
  searchInput.addEventListener('input', filterTable);
  
  // Refresh button
  btnRefresh.addEventListener('click', () => {
    updateStats();
    loadTable(currentTable);
  });
  
  // Reset confirmation triggers
  btnResetDb.addEventListener('click', () => {
    modalConfirm.classList.remove('hidden');
  });
  
  btnModalCancel.addEventListener('click', () => {
    modalConfirm.classList.add('hidden');
  });
  
  btnModalConfirm.addEventListener('click', resetDatabase);
  
  // Close modal when clicking outside
  modalConfirm.addEventListener('click', (e) => {
    if (e.target === modalConfirm) {
      modalConfirm.classList.add('hidden');
    }
  });
  
  // SQL console triggers
  btnRunQuery.addEventListener('click', executeSQL);
  
  sqlInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      executeSQL();
    }
  });
  
  // Templates click
  templateChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sqlInput.value = chip.getAttribute('data-sql');
      executeSQL();
    });
  });

  // --- Initialize ---
  updateStats();
  loadTable('workorders');
});
