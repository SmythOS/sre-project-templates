import express from 'express';
import { Agent, Model, TLLMEvent } from '@SmythOS/sdk';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const PORT = +process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log('__dirname', __dirname);

const agentsDataDir = path.resolve(__dirname, '../agents-data');
if (!fs.existsSync(agentsDataDir)) {
    fs.mkdirSync(agentsDataDir, { recursive: true });
}



let agentPath = path.resolve(agentsDataDir, 'agent.smyth');
let agent: Agent | null = null;

// Check if vault file exists
const vaultPath = path.resolve(__dirname, '../.smyth/vault.json');
const hasVault = fs.existsSync(vaultPath);

if (!hasVault) {
    console.warn('⚠️  WARNING: Vault file not found at:', vaultPath);
    console.warn('⚠️  The agent will not be initialized until a vault file is uploaded.');
    console.warn('⚠️  Please upload vault.json through the app UI.');
}

// Initialize agent if both agent file and vault exist
if (fs.existsSync(agentPath)) {
    if (hasVault) {
        try {
            agent = Agent.import(agentPath, {
                model: Model.OpenAI('gpt-4o', { temperature: 1.0 }),
            });
            console.log('✅ Agent initialized from:', agentPath);
            console.log('✅ Using vault file from:', vaultPath);
        } catch (error) {
            console.error('❌ Failed to initialize agent:', error);
            console.error('This may be due to missing or invalid vault credentials.');
        }
    } else {
        console.log('⏸️  Agent file found but vault is missing. Waiting for vault upload...');
    }
} else {
    console.log('⏸️  No agent file found. Please upload an agent through the app UI.');
}

// Agent file upload endpoint (JSON-based, same as vault)
app.post('/upload-agent', express.json(), async (req, res) => {
    try {
        const agentData = req.body;

        // Validate agent structure
        if (!agentData || typeof agentData !== 'object') {
            return res.status(400).json({ error: 'Invalid agent file format' });
        }

        // Write agent file to agents-data directory
        const newAgentPath = path.resolve(agentsDataDir, 'agent.smyth');
        fs.writeFileSync(newAgentPath, JSON.stringify(agentData, null, 2));

        console.log('✅ Agent file saved to:', newAgentPath);

        // Check if vault file exists before initializing agent
        const vaultPath = path.resolve(__dirname, '../.smyth/vault.json');
        const hasVault = fs.existsSync(vaultPath);

        if (!hasVault) {
            console.warn('⚠️  Agent uploaded but vault file is missing');
            console.warn('⚠️  Agent will not be initialized until vault is uploaded');
            agentPath = newAgentPath; // Update path for later initialization
            return res.json({
                success: true,
                message: 'Agent uploaded successfully. Please upload vault.json to initialize the agent.'
            });
        }

        // Initialize agent with vault present
        try {
            agent = Agent.import(newAgentPath, {
                model: Model.OpenAI('gpt-4o', { temperature: 1.0 }),
            });

            agentPath = newAgentPath; // Update current path

            console.log('✅ Agent uploaded and initialized successfully');
            res.json({ success: true, message: 'Agent uploaded and initialized successfully' });
        } catch (error) {
            console.error('⚠️  Agent uploaded but initialization failed:', error);
            res.json({ success: true, message: 'Agent uploaded successfully, but initialization failed. Please check your agent file.' });
        }
    } catch (error) {
        console.error('❌ Error saving agent file:', error);
        res.status(500).json({ error: 'Failed to save agent file' });
    }
});

// Vault file upload endpoint
app.post('/upload-vault', express.json({ limit: '1mb' }), async (req, res) => {
    try {
        const vaultData = req.body;

        // Validate vault structure
        if (!vaultData || typeof vaultData !== 'object') {
            return res.status(400).json({ error: 'Invalid vault file format' });
        }

        // Check if it has the expected structure (at least a 'default' key)
        if (!vaultData.default || typeof vaultData.default !== 'object') {
            return res.status(400).json({
                error: 'Invalid vault structure. Expected format: { "default": { "openai": "...", ... } }'
            });
        }

        // Create .smyth directory in the nodejs-project directory
        const smythDir = path.resolve(__dirname, '../.smyth');
        if (!fs.existsSync(smythDir)) {
            fs.mkdirSync(smythDir, { recursive: true });
        }

        // Write vault file
        const vaultPath = path.join(smythDir, 'vault.json');
        fs.writeFileSync(vaultPath, JSON.stringify(vaultData, null, 2));

        console.log('✅ Vault file saved to:', vaultPath);

        // Try to initialize agent if it exists but wasn't initialized due to missing vault
        if (!agent && fs.existsSync(agentPath)) {
            try {
                agent = Agent.import(agentPath, {
                    model: Model.OpenAI('gpt-4o', { temperature: 1.0 }),
                });
                console.log('✅ Agent initialized after vault upload');
                res.json({ success: true, message: 'Vault uploaded and agent initialized successfully!' });
            } catch (error) {
                console.error('⚠️  Vault uploaded but agent initialization failed:', error);
                res.json({ success: true, message: 'Vault uploaded successfully, but agent initialization failed. Please check your credentials.' });
            }
        } else {
            res.json({ success: true, message: 'Vault file uploaded successfully' });
        }
    } catch (error) {
        console.error('❌ Error saving vault file:', error);
        res.status(500).json({ error: 'Failed to save vault file' });
    }
});

// SSE STREAMING ENDPOINT
app.post('/message/stream', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (!agent) {
        return res.status(503).json({
            error: 'Agent not initialized. Please upload both a vault.json file and a .smyth agent file through the app.'
        });
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const stream = await agent.prompt(message).stream();

        stream.on(TLLMEvent.Content, (chunk) => {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        });

        stream.on(TLLMEvent.ToolCall, (toolCall) => {
            res.write(`data: ${JSON.stringify({ toolCall })}\n\n`);
        });

        stream.on(TLLMEvent.End, () => {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        });

        stream.on('error', (err) => {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        });
    } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
