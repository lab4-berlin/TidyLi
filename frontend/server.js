import express from 'express';
import { createServer as createViteServer } from 'vite';
import { appendFile, access, writeFile, mkdir, readFile, chmod } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { constants } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// Create Vite server in middleware mode
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa'
});

// Use vite's connect instance as middleware
app.use(vite.middlewares);

// Parse JSON bodies
app.use(express.json());

// Ensure directory exists with proper error handling
async function ensureDir(dirPath) {
  try {
    await access(dirPath, constants.F_OK);
  } catch {
    try {
      await mkdir(dirPath, { recursive: true });
      // Ensure directory has proper permissions (755)
      await chmod(dirPath, 0o755);
    } catch (error) {
      console.error(`Failed to create/set permissions for directory ${dirPath}:`, error);
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }
}

// Ensure a decision file exists with proper permissions
async function ensureDecisionFile(type) {
  const dataDir = join(__dirname, 'public', 'data');
  const filePath = join(dataDir, `${type}.csv`);
  
  try {
    // Ensure data directory exists with proper permissions
    await ensureDir(dataDir);
    
    let fileExists = true;
    try {
      await access(filePath, constants.F_OK);
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      // Create file with header and proper permissions (644)
      await writeFile(filePath, 'profileUrl\n', { mode: 0o644 });
      await chmod(filePath, 0o644);
    } else {
      // Ensure existing file has proper permissions
      await chmod(filePath, 0o644);
    }

    // Verify we can write to the file
    try {
      await access(filePath, constants.W_OK);
    } catch (error) {
      console.error(`File ${filePath} is not writable:`, error);
      throw new Error(`File ${filePath} is not writable: ${error.message}`);
    }
    
    return filePath;
  } catch (error) {
    console.error(`Failed to ensure ${type}.csv exists:`, error);
    throw new Error(`Failed to ensure ${type}.csv exists: ${error.message}`);
  }
}

// Parse CSV to array of URLs
function parseDecisionCSV(csvContent) {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('Empty CSV file');
    }

    const header = lines[0].trim();
    if (header !== 'profileUrl') {
      throw new Error('Invalid CSV header');
    }

    return lines.slice(1)
      .filter(line => line.trim())
      .map(line => line.trim());
  } catch (error) {
    console.error('Failed to parse CSV:', error);
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}

// Validate decision data
function validateDecision(data) {
  if (!data || typeof data !== 'object') {
    return ['Invalid request data'];
  }

  const { profileUrl, decision } = data;
  const errors = [];

  if (!profileUrl || typeof profileUrl !== 'string') {
    errors.push('Profile URL is required and must be a string');
  }
  if (!decision || typeof decision !== 'string') {
    errors.push('Decision is required and must be a string');
  }
  if (decision && !['keep', 'remove'].includes(decision)) {
    errors.push('Decision must be either "keep" or "remove"');
  }

  return errors;
}

// Get all decisions
app.get('/api/decisions', async (req, res) => {
  try {
    const [keepPath, removePath] = await Promise.all([
      ensureDecisionFile('keep'),
      ensureDecisionFile('remove')
    ]);

    const [keepContent, removeContent] = await Promise.all([
      readFile(keepPath, 'utf-8'),
      readFile(removePath, 'utf-8')
    ]);

    const keepUrls = parseDecisionCSV(keepContent);
    const removeUrls = parseDecisionCSV(removeContent);

    res.json({
      success: true,
      keep: keepUrls,
      remove: removeUrls
    });
  } catch (error) {
    console.error('Error reading decisions:', error);
    res.status(500).json({ success: false }); 
  }
});

// Handle decisions
app.post('/api/decisions', async (req, res) => {
  try {
    const validationErrors = validateDecision(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false });
    }

    const { profileUrl, decision } = req.body;
    
    // Sanitize the URL to prevent CSV injection
    const sanitizedUrl = profileUrl.replace(/[\n\r]/g, '').trim();
    
    const filePath = await ensureDecisionFile(decision);

    // Append the decision with proper error handling
    try {
      await appendFile(filePath, `${sanitizedUrl}\n`, { mode: 0o644 });
    } catch (error) {
      console.error(`Failed to write to ${filePath}:`, error);
      return res.status(500).json({ success: false });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving decision:', error);
    res.status(500).json({ success: false });
  }
});

// Create decision files on startup
Promise.all([
  ensureDecisionFile('keep'),
  ensureDecisionFile('remove')
]).catch(error => {
  console.error('Error creating decision files:', error);
  process.exit(1);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});