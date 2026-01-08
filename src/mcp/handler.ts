import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { tools } from "../github/tools.js";

const router = Router();

// MCP handler function
const handleMcp = async (req: any, res: any) => {
  const message = req.body;

  try {
    let response;

    switch (message.method) {
      case "initialize":
        response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: {
              name: "github-mcp-server",
              version: "1.0.0",
            },
          },
        };
        break;

      case "tools/list":
        response = {
          jsonrpc: "2.0",
          id: message.id,
          result: {
            tools: Object.values(tools).map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          },
        };
        break;

      case "tools/call":
        const toolName = message.params?.name;
        const toolArgs = message.params?.arguments || {};
        const tool = tools[toolName as keyof typeof tools];

        if (!tool) {
          response = {
            jsonrpc: "2.0",
            id: message.id,
            error: { code: -32601, message: `Unknown tool: ${toolName}` },
          };
        } else {
          try {
            const result = await tool.handler(toolArgs);
            response = {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                content: [
                  { type: "text", text: JSON.stringify(result, null, 2) },
                ],
              },
            };
          } catch (err: any) {
            response = {
              jsonrpc: "2.0",
              id: message.id,
              error: {
                code: -32000,
                message: err.message || "Tool execution failed",
              },
            };
          }
        }
        break;

      default:
        response = {
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32601, message: "Method not found" },
        };
    }

    res.json(response);
  } catch (err) {
    console.error("MCP error:", err);
    res.status(500).json({
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32603, message: "Internal error" },
    });
  }
};

// Mount handler on both / and /mcp (Claude uses root path)
router.post("/", requireAuth, handleMcp);
router.post("/mcp", requireAuth, handleMcp);

export const mcpRouter = router;
