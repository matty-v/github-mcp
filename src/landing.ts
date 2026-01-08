import { config } from "./config.js";
import { tools } from "./github/tools.js";

function getCategoryInfo(toolName: string): { category: string; color: string } {
  if (toolName.includes("repo")) {
    return { category: "Repositories", color: "#58a6ff" };
  }
  if (toolName.includes("issue") || toolName.includes("comment")) {
    return { category: "Issues", color: "#3fb950" };
  }
  return { category: "General", color: "#8b949e" };
}

function formatParamType(prop: any): string {
  if (prop.enum) {
    return prop.enum.map((v: string) => `"${v}"`).join(" | ");
  }
  if (prop.type === "array") {
    return "string[]";
  }
  return prop.type || "any";
}

export function generateLandingPage(): string {
  const toolCards = Object.values(tools)
    .map((tool) => {
      const { category, color } = getCategoryInfo(tool.name);
      const params = Object.entries(tool.inputSchema.properties || {})
        .map(([name, prop]: [string, any]) => {
          const required = tool.inputSchema.required?.includes(name);
          const type = formatParamType(prop);
          return `<div class="param">
            <span class="param-name">${name}${required ? "" : "?"}</span>
            <span class="param-type">${type}</span>
            ${prop.description ? `<span class="param-desc">${prop.description}</span>` : ""}
          </div>`;
        })
        .join("");

      return `
        <div class="tool-card">
          <div class="tool-header">
            <span class="tool-name" style="--glow-color: ${color}">${tool.name}</span>
            <span class="category-badge" style="background: ${color}20; color: ${color}; border-color: ${color}40">${category}</span>
          </div>
          <p class="tool-description">${tool.description}</p>
          ${params ? `<div class="params">${params}</div>` : ""}
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub MCP Server</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --border-color: #30363d;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --accent-blue: #58a6ff;
      --accent-green: #3fb950;
      --accent-purple: #a371f7;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'JetBrains Mono', monospace;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.6;
    }

    .backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        radial-gradient(ellipse at 20% 20%, rgba(59, 185, 80, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(88, 166, 255, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(163, 113, 247, 0.1) 0%, transparent 60%);
      pointer-events: none;
      z-index: -1;
    }

    .grid-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        linear-gradient(rgba(48, 54, 61, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(48, 54, 61, 0.3) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
      z-index: -1;
      opacity: 0.5;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 4rem 2rem;
      position: relative;
    }

    .hero {
      text-align: center;
      margin-bottom: 4rem;
      padding: 3rem;
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-green), var(--accent-blue), var(--accent-purple));
    }

    .hero-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .hero h1 {
      font-size: 2.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-blue) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      color: var(--text-secondary);
      font-size: 1.1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .section {
      margin-bottom: 3rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 500;
      margin-bottom: 1.5rem;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .section-title::before {
      content: '';
      width: 4px;
      height: 1.5rem;
      background: var(--accent-green);
      border-radius: 2px;
    }

    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .tool-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .tool-card:hover {
      border-color: var(--accent-blue);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(88, 166, 255, 0.1);
    }

    .tool-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .tool-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      text-shadow: 0 0 20px var(--glow-color);
    }

    .category-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      border: 1px solid;
      font-weight: 500;
    }

    .tool-description {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .params {
      background: var(--bg-tertiary);
      border-radius: 8px;
      padding: 1rem;
    }

    .param {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-color);
    }

    .param:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .param:first-child {
      padding-top: 0;
    }

    .param-name {
      color: var(--accent-blue);
      font-weight: 500;
    }

    .param-type {
      color: var(--accent-purple);
      font-size: 0.85rem;
    }

    .param-desc {
      width: 100%;
      color: var(--text-secondary);
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }

    .setup-box {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 2rem;
    }

    .setup-steps {
      list-style: none;
      counter-reset: step;
    }

    .setup-steps li {
      counter-increment: step;
      padding: 1rem 0;
      padding-left: 3rem;
      position: relative;
      border-bottom: 1px solid var(--border-color);
    }

    .setup-steps li:last-child {
      border-bottom: none;
    }

    .setup-steps li::before {
      content: counter(step);
      position: absolute;
      left: 0;
      top: 1rem;
      width: 2rem;
      height: 2rem;
      background: var(--accent-green);
      color: var(--bg-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .url-box {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
    }

    .url-box code {
      flex: 1;
      color: var(--accent-blue);
      font-size: 0.95rem;
      word-break: break-all;
    }

    .copy-btn {
      background: var(--accent-green);
      color: var(--bg-primary);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 500;
      font-size: 0.85rem;
      transition: all 0.2s ease;
    }

    .copy-btn:hover {
      background: #2ea043;
      transform: scale(1.05);
    }

    .copy-btn:active {
      transform: scale(0.95);
    }

    .footer {
      text-align: center;
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .footer a {
      color: var(--accent-blue);
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .container {
        padding: 2rem 1rem;
      }

      .hero h1 {
        font-size: 1.75rem;
      }

      .tools-grid {
        grid-template-columns: 1fr;
      }

      .url-box {
        flex-direction: column;
        align-items: stretch;
      }
    }
  </style>
</head>
<body>
  <div class="backdrop"></div>
  <div class="grid-overlay"></div>

  <div class="container">
    <header class="hero">
      <div class="hero-icon">&#128025;</div>
      <h1>GitHub MCP Server</h1>
      <p>Personal GitHub integration for Claude.ai using the Model Context Protocol. Manage repositories and issues directly from Claude.</p>
    </header>

    <section class="section">
      <h2 class="section-title">Available Tools</h2>
      <div class="tools-grid">
        ${toolCards}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Getting Started</h2>
      <div class="setup-box">
        <ol class="setup-steps">
          <li>Open <strong>Claude.ai</strong> and go to <strong>Settings &gt; Connectors</strong></li>
          <li>Click <strong>Add Connector</strong> and select <strong>MCP Server</strong></li>
          <li>Paste the server URL below and authenticate with your Google account</li>
          <li>Start using GitHub tools in your Claude conversations!</li>
        </ol>
        <div class="url-box">
          <code id="server-url">${config.baseUrl}/mcp</code>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('server-url').textContent).then(() => { this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000); })">Copy</button>
        </div>
      </div>
    </section>

    <footer class="footer">
      <p>Authorized for <strong>${config.allowedEmail}</strong> &bull; <a href="/health">Health Check</a></p>
    </footer>
  </div>
</body>
</html>`;
}
