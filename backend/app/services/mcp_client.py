"""Client for the HealthPrior MCP HTTP server."""
import httpx
import json
from app.core.config import settings


class MCPClient:
    """HTTP client for calling the MCP server tools."""

    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.MCP_SERVER_URL

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call an MCP tool via HTTP."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/mcp/",
                    headers={"Accept": "application/json, text/event-stream"},
                    json={
                        "jsonrpc": "2.0",
                        "method": "tools/call",
                        "params": {"name": tool_name, "arguments": arguments},
                        "id": 1,
                    },
                )
                response.raise_for_status()
                result = response.json()
                return result.get("result", {})
        except Exception as e:
            # MCP server unavailable — degrade gracefully
            return {"error": str(e), "fallback": True}

    async def get_coverage_criteria(self, policy_id: str = "MCR-621") -> dict:
        return await self.call_tool("get_coverage_criteria", {"policy_id": policy_id})

    async def search_icd10(self, condition: str) -> list:
        result = await self.call_tool("search_icd10_codes", {"condition_description": condition})
        return result if isinstance(result, list) else []

    async def validate_fhir(self, resource: dict) -> dict:
        return await self.call_tool("validate_fhir_resource", {"resource": resource})
